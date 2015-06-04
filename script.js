/**
 *	動けばいいので、特にモデルとかの複雑な設計はしてない
 */

/**
 * ゲームを管理するクラス
 * @param {HTMLElement} $base ビューのベースとなるDOM要素
 */
function Game($base){
	/**
	 * 盤の状態
	 * @type {Game.CellState[][]}
	 */
	this.board;

	/**
	 * 現在のターン
	 * @type {Game.Turn}
	 */
	this.turn = Game.Turn.BLACK;

	/**
	 * ビューのベースとなるDOM要素
	 * @type {HTMLElement}
	 */
	this.$base = $base;

	/**
	 * 各マスのビューとなるDOM要素の配列
	 * @type {HTMLElement[][]}
	 */
	this.$cells;

	this.initialize();
	this.initializeView();
	this.updateView();
}

/**
 * ターン
 * @enum {number}
 */
Game.Turn = {
	BLACK: -1,
	WHITE: 1
};

/**
 * セルの状態
 * @enum {number}
 */
Game.State = {
	BLACK: -1,
	EMPTY: 0,
	WHITE: 1
};

/**
 * 方向
 * @type {{
 *   dx: number,
 *   dy: number
 * }}
 */
Game.Directions = [{
	x: -1, y: -1
},{
	x: 0, y: -1
},{
	x: 1, y: -1
},{
	x: 1, y: 0
},{
	x: 1, y: 1
},{
	x: 0, y: 1
},{
	x: -1, y: 1
},{
	x: -1, y: 0
}];

/**
 * 初期化を行う
 */
Game.prototype.initialize = function(){
	var board = [];

	// 盤の状態を初期化
	for (var x = 0; x < 10; x++) {
		board[x] = [];
		for (var y = 0; y < 10; y++) {
			board[x][y] = Game.State.EMPTY;
		}
	}

	// 初期配置をセット
	board[4][4] = Game.State.BLACK;
	board[5][5] = Game.State.BLACK;
	board[4][5] = Game.State.WHITE;
	board[5][4] = Game.State.WHITE;

	this.board = board;
};

/**
 * ビューの初期化を行う
 */
Game.prototype.initializeView = function(){
	var $base = this.$base,
		$cells = [],
		$cell;

	//いらない子要素全部消す
	while ($base.firstElementChild) {
		$base.removeChild($base.firstElementChild);
	}

	//8*8のセルを作る
	for (var x = 1; x <= 8; x++) {
		$cells[x] = [];
		for (var y = 1; y <= 8; y++) {
			$cell = document.createElement('div');
			$cell.classList.add('cell');
			$base.appendChild($cell);
			$cells[x][y] = $cell;
		}
	}
	this.$cells = $cells;

	//$baseがクリックされた時の処理
	// bind(this) は今はおまじないだと思っておけば良い。
	//
	// 詳しく言えば、クロージャのキャプチャのこと。
	// onClickBaseの中のthisを,現在のthisにした。
	$base.addEventListener('click', this.onClickBase.bind(this));
};

Game.prototype.onClickBase = function(ev) {
	var $clickedCell = ev.target,
		$cells = this.$cells;

	//クリックされたセルを探す
	for (var x = 1; x <= 8; x++) {
		for (var y = 1; y <= 8; y++) {
			if ($cells[x][y] !== $clickedCell) continue;

			//そこへ置けたら、ターンチェンジ
			if (this.put(x, y)) {
				this.turn *= -1; //@TODO: 汚い。
				this.updateView();
			}
		}
	}

};

/**
 * ビューの更新を行う
 */
Game.prototype.updateView = function(){
	var board = this.board,
		$cells = this.$cells,
		$cell, state;

	//各マスの状態を変更する
	for (var x = 1; x <= 8; x++) {
		for (var y = 1; y <= 8; y++) {
			$cell = $cells[x][y];
			state = board[x][y];
			$cell.classList.toggle('cell-black', state === Game.State.BLACK);
			$cell.classList.toggle('cell-empty', state === Game.State.EMPTY);
			$cell.classList.toggle('cell-white', state === Game.State.WHITE);
		}
	}
};

/**
 * (x, y)に現在のターンの人が置けるかどうか確認する
 * @param {number} x 位置x
 * @param {number} y 位置y
 * @return {boolean} おける場合trueを返す
 */
Game.prototype.checkValid = function(x, y) {
	//無効な位置 -> false
	if (x < 1 || x > 8 || y < 1 || y > 8) return false;

	var board = this.board,
		dirs = Game.Directions,
		current = this.turn,
		another = this.turn * -1,	//@TODO: 汚い。
		dir, px, py;

	//空きマスではない -> false
	if (board[x][y] !== Game.State.EMPTY) return false;

	//各方向について、裏返しが生じるかどうか確認する
	for (var i = 0; i < dirs.length; i++) {
		dir = dirs[i];

		px = x + dir.x;
		py = y + dir.y;

		//隣が相手の色ではないなら裏返しは生じない
		if (board[px][py] != another) continue;

		//相手の色以外のマスに辿り着くまで進む
		while (board[px][py] == another) {
			px += dir.x;
			py += dir.y;
		}

		//そこに自分と同じ色がアレば裏返し成功 -> trueを返す
		if (board[px][py] == current) {
			return true;
		}
	}

	//どの方向にも裏返しが生じなかった
	return false;
};

/**
 * (x, y)に現在のターンの人が石を置く
 * @param {number} x 位置x
 * @param {number} y 位置y
 * @return {boolean} 置くことが出きた場合trueを返す。
 */
Game.prototype.put = function(x, y) {
	// そこには置けない -> false
	if (!this.checkValid(x, y)) return false;

	var board = this.board,
		dirs = Game.Directions,
		current = this.turn,
		another = this.turn * -1,	//@TODO: 汚い。
		dir, px, py;

	//まず指定の場所に置く
	board[x][y] = current;

	//各方向について、裏返しが生じるかどうか確認する
	for (var i = 0; i < dirs.length; i++) {
		dir = dirs[i];

		px = x + dir.x;
		py = y + dir.y;

		//隣が相手の色ではないなら裏返しは生じない
		if (board[px][py] != another) continue;

		//相手の色以外のマスに辿り着くまで進む
		while (board[px][py] == another) {
			px += dir.x;
			py += dir.y;
		}

		//そこに自分と同じ色がアレば裏返し成功
		// -> 戻っていきながら裏返していく
		if (board[px][py] == current) {
			while (!(px == x && py == y)) {
				board[px][py] = current;
				px -= dir.x;
				py -= dir.y;
			}
		}
	}

	return true;
};
