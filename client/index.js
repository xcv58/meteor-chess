var board, game;

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
    if (Session.get("counter") >= 1) {
        alert("run out");
        return false;
    }
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

var onDrop = function(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    console.log(source);
    console.log(target);

    data = Board.findOne("id");
    data.position = game.fen();
    object = {
        "source": source,
        "target": target
    }
    data.history.push(object);
    data.position = game.fen();
    console.log(data.position);
    Board.update("id", data);

    Session.set('counter', Session.get('counter') + 1);

    updateStatus();
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
    board.position(game.fen());
};

function updateGame() {
    data = Board.findOne("id");
    game = new Chess();
    for (i in data.history) {
        move = data.history[i];
        source = move.source;
        target = move.target;
        console.log("source: " + source);
        console.log("target: " + target);
        var result = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });
        if (result === null) {
            console.log("invalid move");
        } else {
            console.log("valid move");
        }
    }
    board.position(data.position);
    updateStatus();
}

var updateStatus = function() {
    var status = '';

    var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    // checkmate?
    if (game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    }

    // draw?
    else if (game.in_draw() === true) {
        status = 'Game over, drawn position';
    }

    // game still on
    else {
        status = moveColor + ' to move';

        // check?
        if (game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    $('#status').html(status);
    $('#fen').html(game.fen());
    $('#pgn').html(game.pgn());
};

var onChange = function(oldPos, newPos) {
    // console.log("Position changed:");
    // console.log("Old position: " + ChessBoard.objToFen(oldPos));
    // console.log("New position: " + ChessBoard.objToFen(newPos));

    position = Board.findOne({_id: "id"});
    position.position = ChessBoard.objToFen(newPos);

    Board.update("id", position);
};

function createBoard() {
    data = Board.findOne({_id: "id"});
    // position.position;
    // position: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
    var cfg = {
        showNotation: true,
        draggable: true,
        dropOffBoard: 'snapback',
        moveSpeed: 'slow',
        snapbackSpeed: 500,
        snapSpeed: 100,
        position: data.position,
        sparePieces: true,
        onDragStart: onDragStart,
        onDrop: onDrop,
        // onChange: onChange,
        onSnapEnd: onSnapEnd
    };
    board = new ChessBoard('board', cfg);
    updateGame();
    $('#clearBtn').on('click', board.clear);
    $('#getPositionBtn').on('click', function() {
        console.log("Current position as an Object:");
        console.log(board.position());
        console.log("Current position as a FEN string:");
        console.log(board.fen());
    });
}

Meteor.subscribe('board', function() {
    createBoard();
});

Meteor.startup(function (){
    Session.setDefault('counter', 0);
});

Template.main.helpers({
    title: function() {
        data = Board.findOne("id");
        // createBoard();
        updateGame();
        return data.position;
    },
});

Template.button.events({
    'click #startBtn': function(event, template) {
        data = Board.findOne("id");
        data.history = [];
        data.position = "start";
        Session.set('counter', 0);
        Board.update("id", data);
    },
});

Template.status.helpers({
    count: function() {
        return Session.get('counter');
    },
})
