/**
 * Created by Home Laptop on 14-Jul-17.
 */
'use strict';

var Schema = mDb.Schema;
var ObjectId = Schema.ObjectId;

var BallCodes = {
    Normal : 1,
    Wide : 2,
    NoBall : 3,
    Four : 4,
    Out : 5,
    Six : 6,
    DeadBall : 7
};

var AdditionalCode = {
    LegBye : 1,
    Bye : 2,
    Bat : 3
};

var OutReason = {
    Bowled : 1,
    RunOut : 2,
    CatchOut : 3,
    LBW : 4,
    Stumped : 5
};

var BallSchema = Schema({
    _id : { type : String, required : true },
    Over : { type : Number, required : true },
    BallNo : { type : Number, default : 0 },
    BatsmanID : { type : String },
    BowlerID : { type : String, required : true },
    Score : { type : Number, default : 0 },
    Details : { type : String },
    OutID : { type : String }
});

var BatsmanSchema = Schema({
    _id : { type : String, required : true },
    BallsFaced : { type : Number, default : 0 },
    Score : { type : Number, default : 0 },
    EffectiveBalls : { type : Number, default : 0 },
    Fours : { type : Number, default : 0 },
    Sixes : { type : Number, default : 0 },
    BowlerIDWhenOut : { type : String },
    FallOfWicketReason : { type : String },
    FallOfWicketPlayerID : { type : String }
});

var WicketSchema = Schema({
    _id : { type : String, required : true },
    OverID : { type : String, required : true },
    BatsmanID : { type : String, required : true },
    BowlerID : { type : String, required : true },
    BallNo : { type : Number, required : true }
});

var BowlerSchema = Schema({
    _id : { type : String, required : true },
    BallsDelivered : { type : Number, default : 0 },
    Wides : { type : Number, default : 0 },
    NoBalls : { type : Number, default : 0 },
    DeadBall : { type : Number, default : 0 },
    Score : { type : Number, default : 0 },
    Wickets : [ { type : String } ]
});

var InningsSchema = Schema({
    _id : { type : String, required : true, default : "1" },
    TotalScore : { type : Number, default : 0 },
    Extras : { type : Number, default : 0 },
    TargetScore : { type : Number, default : 0 },
    TotalEffectiveBalls : { type : Number, default : 0 },
    TotalBalls : { type : Number, default : 0 },
    ActivePlayers : {
        FacingBatsman : { type : String },
        OtherBatsman : { type : String },
        Bowler : { type : String }
    },
    Balls : [ BallSchema ],
    Teams : {
        Batting : {
            ID : { type : String },
            Players : [ BatsmanSchema ],
            Order : [ { type : String } ]
        },
        Bowling : {
            ID : { type : String },
            Players : [ BowlerSchema ]
        }
    },
    Wickets : [ WicketSchema ]
});

var MatchSchema = Schema({
    _id : { type : String, required : true },
    Teams : [ { type : String } ],
    Innings : [ InningsSchema ],
    StartTime : { type : Date },
    EndTime : { type : Date },
    TossWinner : { type : String },
    Result : { type : String }
});

module.exports = {
    BallCodes : BallCodes,
    AdditionalCode : AdditionalCode,
    OutReason : OutReason,
    BallSchema : BallSchema,
    BatsmanSchema : BatsmanSchema,
    WicketSchema : WicketSchema,
    BowlerSchema : BowlerSchema,
    InningsSchema : InningsSchema,
    MatchSchema : MatchSchema
};