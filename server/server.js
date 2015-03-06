Meteor.publish("board", function () {
    if (Board.find().count() === 0) {
        Board.insert({
            _id: "id",
            position: "start",
            history: [],
        });
    }
    return Board.find();
});

Meteor.publish("tokens", function () {
    return Tokens.find();
});

Meteor.publish("history", function () {
    return History .find();
});
