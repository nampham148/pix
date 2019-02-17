var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Fight = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'Account'},
    opponent: {type: String, required: true},
    result: {type: Boolean, required: true}, 
    gold_drop: {type: Number, required: true}
});

module.exports = mongoose.model('Fight', Fight);