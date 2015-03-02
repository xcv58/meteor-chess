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
