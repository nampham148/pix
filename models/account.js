var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
    username: {type: String, required: true},
    password: String,
    inherent_power: {type: Number, default: 80},
    bonus_power: {type: Number, default: 0},
    stamina: {type: Number, default: 150},
    stamina_regen: {type: Number, default: 5},
    gold: {type: Number, default: 0},
    empowered: {type: Boolean, default: false}
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
