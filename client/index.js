var board, game;

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  if (Session.get("noinvite")) {
    alert("Please input invite code");
    return false;
  }
  if (Session.get("counter") >= Session.get("MAX")) {
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
  invite = Tokens.findOne(Session.get('invite'));
  invite.count = invite.count - 1;
  Tokens.update(invite._id, invite);

  updateStatus();
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion

function updateGame() {
  data = Board.findOne("id");
  game = new Chess();
  for (i in data.history) {
    move = data.history[i];
    source = move.source;
    target = move.target;
    var result = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    if (result === null) {
      console.log("invalid move");
    }
  }
  direction = Session.get("direction");
  if (direction === undefined) {
    direction = game.turn();
    Session.set("direction", direction);
  }
  if (direction === 'w') {
    board.orientation('white');
  } else {
    board.orientation('black');
  }

  board.position(data.position);
  updateStatus();
  return game.turn();
}

function nextMove() {
  var step = Session.get("currentStep");
  Session.set("currentStep", step + 1);
  var data = Board.findOne("id");
  var game = new Chess();
  for (var i in data.history) {
    if (i >= step) {
      break;
    }
    var move = data.history[i];
    var source = move.source;
    var target = move.target;
    var result = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    if (result === null) {
      console.log("invalid move");
    }
  }
  board.position(game.fen());
  // direction = Session.get("direction");
  // if (direction === undefined) {
  //   direction = game.turn();
  //   Session.set("direction", direction);
  // }
  // if (direction === 'w') {
  //   board.orientation('white');
  // } else {
  //   board.orientation('black');
  // }

  // updateStatus();
  // return game.turn();
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

Meteor.subscribe('history');

Meteor.subscribe('tokens');

Meteor.startup(function (){
  Session.setDefault('counter', 0);
  Session.setDefault('MAX', 1);
  Session.setDefault('password', 'password');
  Session.setDefault('login', false);
  Session.setDefault('noinvite', true);
  Session.setDefault('currentStep', 0);
});

Template.invite.helpers({
  noinvite: function() {
    return Session.get('noinvite');
  },
  complete: function() {
    return Session.get("counter") >= Session.get("MAX");
  }
});

Template.main.helpers({
  title: function() {
    // data = Board.findOne("id");
    // createBoard();
    updateGame();

    var moveColor = 'White';
    if (game.turn() === 'b') {
      moveColor = 'Black';
    }
    if (game.game_over() === true) {
      if (game.turn() === 'b') {
        moveColor = 'White';
      }
      return 'Game Over, ' + moveColor + ' win!';
    }
    return moveColor + ' turn!';
  },
});

Template.status.helpers({
  count: function() {
    return Session.get('counter');
  },
  max: function() {
    return Session.get('MAX');
  },
  login: function() {
    return Session.get('login');
  },
  invites: function() {
    var invites = Tokens.find({count : 1}).fetch();
    var lines = '';
    for (i in invites) {
      if (invites[i].count > 0) {
        lines += invites[i]._id + '\n';
      }
    }
    return lines;
  },
})
Template.invite.events({
  'click #inviteButton': function(event) {
    var value = document.getElementById('inviteInput').value;
    var result = Tokens.findOne(value);
    if (result === undefined) {
      alert("Invalid invite code!");
      return;
    }
    if (result.count === 0) {
      alert("Invite code already used!");
      return;
    }
    Session.set("noinvite", false);
    Session.set("invite", value);
  }
});

Template.status.events({
  'keydown input[type=number]': function(event) {
    // ESC or ENTER
    if (event.which === 27 || event.which === 13) {
      event.preventDefault();
      event.target.blur();
    }
  },

  'click #max': function(event) {
    console.log(event.target.value);
    Session.set("MAX", event.target.value);
  },

  'click #login': function(event) {
    // alert($("#password").value);
    var value = document.getElementById('password').value;
    if (value === Session.get("password")) {
      Session.set("login", true);
    } else {
      alert("Your password is incorrect!");
    }
  },

  'keyup input[type=number]': function(event) {
    var charCode = (event.which) ? event.which : event.keyCode;
    if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
      return;
    }
    event.target.value;
    console.log(event.target.value);
    Session.set("MAX", event.target.value);
  },

  'click #startBtn': function(event, template) {
    data = Board.findOne("id");
    var history = data.history;
    console.log(history);
    // History.
    History.insert({
      createdAt: new Date(),
      content: history
    });

    var tokens = Tokens.find().fetch();

    for (i in tokens) {
      console.log(i);
      Tokens.remove(tokens[i]._id);
    }

    for (i = 0; i < 100; i++) {
      Tokens.insert({
        count: 1
      });
    }

    data.history = [];
    data.position = "start";
    Session.set('counter', 0);
    Session.set('direction', 'w');
    Board.update("id", data);
  },

  'click #nextMove': function(event) {
    nextMove();
  }
});
