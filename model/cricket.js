/**
 * Created by Home Laptop on 14-Jul-17.
 */
'use strict';

var globals = require('./global');

var Schema = mDb.Schema;
var ObjectId = Schema.ObjectId;

var BallCodes = {
    Normal : 1,
    Wide : 2,
    NoBall : 3,
    Out : 4,
    Four : 5,
    Six : 6
};

var BallSchema = Schema({
    _id : { type : String, required : true },
    BatsmanID : { type : String, required : true },
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
    Over : { type : String, required : true }
});

var BowlerSchema = Schema({
    _id : { type : String, required : true },
    BallsDelivered : { type : Number, default : 0 },
    Wides : { type : Number, default : 0 },
    NoBalls : { type : Number, default : 0 },
    Wickets : [ WicketSchema ]
});

var OverSchema = Schema({
    _id : { type : String, required : true },
    Balls : [ BallSchema ]
});

var InningsSchema = Schema({
    _id : { type : String, required : true, default : "1" },
    TotalScore : { type : Number, default : 0 },
    TargetScore : { type : Number, default : 0 },
    FallenWickets : { type : Number, default : 0 },
    TotalEffectiveBalls : { type : Number, default : 0 },
    ActivePlayers : {
        FacingBatsman : { type : String },
        OtherBatsman : { type : String },
        Bowler : { type : String }
    },
    Overs : [ OverSchema ],
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
    }
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


/**Find an Inning by ID**/
MatchSchema.methods.findInnings = function (InningsID) {
    var game = this;
    return createPromise()
        .then(function () {
            
            if (game.Innings.id(InningsID))
                return game.Innings.id(InningsID);
            
            var newInning = new Inning();
            newInning._id = InningsID;
            game.Innings.push(newInning);
            
            return newInning;
        });
};

/**Find an Over by ID**/
MatchSchema.methods.findOver = function (Inning, OverID) {
    if (Inning.Overs.id(OverID))
        return Inning.Overs.id(OverID);
    var Over = new Over();
    Over._id = OverID;
    Inning.Overs.push(Over);
    return Over;
};

/**End a match**/
MatchSchema.methods.endMatch = function () {
    var game = this;
    game.EndTime = new Date();
    
    if (game.Innings.length > 1) {
        if (game.Innings[ 0 ].TotalScore > game.Innings[ 0 ].TotalScore)
            game.Result = game.Innings[ 0 ].Teams.Batting.ID;
        else if (game.Innings[ 0 ].TotalScore < game.Innings[ 0 ].TotalScore)
            game.Result = game.Innings[ 1 ].Teams.Batting.ID;
        else game.Result = "Draw";
    }
    else game.Result = "Dismissed";
    
    return game.save()
        .then(function () {
            return game;
        })
        .catch(function (e) {
            console.log(e);
        });
};

/**Set Initial Data, Only once per match**/
MatchSchema.methods.setInitialInningsData = function (InningsID, BattingTeam, BowlingTeam) {
    var game = this;
    return this.findInnings(InningsID)
        .then(function (Inning) {
            Inning.Teams.Batting.ID = BattingTeam;
            Inning.Teams.Bowling.ID = BowlingTeam;
            /*Todo: Fill with Team Data*/
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

/**Set on Starting of Inning**/
MatchSchema.methods.setOpeners = function (InningsID, FacingBatsMan, OtherBatsman, Bowler) {
    var game = this;
    return this.findInnings(InningsID)
        .then(function (Inning) {
            Inning.ActivePlayers.FacingBatsman = FacingBatsMan;
            Inning.ActivePlayers.OtherBatsman = OtherBatsman;
            Inning.ActivePlayers.Bowler = Bowler;
            Inning.Teams.Batting.Order.push(FacingBatsMan);
            Inning.Teams.Batting.Order.push(OtherBatsman);
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

/**Move to Next Innings**/
MatchSchema.methods.nextInnings = function () {
    var game = this;
    return createPromise()
        .then(function () {
            var oldInning = this.Innings[ this.Innings.length - 1 ];
            var newInning = new Inning();
            
            newInning._id = this.Innings.length + 1;
            newInning.Teams.Batting.ID = oldInning.Teams.Bowling.ID;
            newInning.Teams.Bowling.ID = oldInning.Teams.Batting.ID;
            newInning.TargetScore = oldInning.TotalScore + 1;
            
            var Index, Player;
            
            for (Index in oldInning.Teams.Batting.Players) {
                Player = new Bowler();
                Player._id = oldInning.Teams.Batting.Players[ Index ]._id;
                newInning.Teams.Bowling.Players.push(Player);
            }
            
            for (Index in oldInning.Teams.Bowling.Players) {
                Player = new Batsman();
                Player._id = oldInning.Teams.Bowling.Players[ Index ]._id;
                newInning.Teams.Batting.Players.push(Player);
            }
            
            this.Innings.push(newInning);
            
            return this.save()
                .then(function () {
                    return game;
                });
        });
};

/**Player Gets Out**/
MatchSchema.methods.playerOut = function (InningsID, Over, BallId, PlayerOut, NewFacingPlayer, NewOtherPlayer, oldFacingID, Bowler, OutReason, ReasonPlayerID) {
    var game = this;
    return game.findInnings(InningsID)
        .then(function (Inning) {
            Inning.ActivePlayers.FacingBatsman = NewFacingPlayer;
            Inning.ActivePlayers.OtherBatsman = NewOtherPlayer;
            Inning.ActivePlayers.Bowler = Bowler;
            
            if (Inning.Teams.Batting.Order.indexOf(NewFacingPlayer) === -1)
                Inning.Teams.Batting.Order.push(NewFacingPlayer);
            else Inning.Teams.Batting.Order.push(NewOtherPlayer);
            
            var OutPlayer = Inning.Teams.Batting.Players.id(PlayerOut);
            OutPlayer.BallsFaced++;
            OutPlayer.EffectiveBalls++;
            OutPlayer.BowlerIDWhenOut = Bowler;
            OutPlayer.FallOfWicketReason = OutReason;
            OutPlayer.FallOfWicketPlayerID = ReasonPlayerID;
            
            Inning.TotalEffectiveBalls++;
            Inning.FallenWickets++;
            
            Bowler = Inning.Teams.Bowling.Players.id(Bowler);
            
            var wicket = new Wicket();
            wicket._id = Bowler.Wickets.length + 1;
            wicket.Over = Over + "." + BallId;
            
            Bowler.Wickets.push(wicket);
            Bowler.BallsDelivered++;
            
            Over = game.findOver(Inning, Over);
            
            var Ball = new Ball();
            Ball._id = Over.length + 1;
            Ball.BatsmanID = oldFacingID;
            Ball.Bowler = Bowler;
            Ball.Details = BallCodes.Out;
            Ball.OutID = OutPlayer;
            Over.Balls.push(Ball);
            
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

/**Normal Score**/
MatchSchema.methods.Score = function (InningID, ballCode, bowler, OverId, Score, switchSides) {
    var game = this;
    return game.findInnings(InningID)
        .then(function (Inning) {
            if (ballCode === BallCodes.Wide)
                Score++;
            Inning.TotalScore += Score;
            var Over = game.findOver(Inning, OverId);
            var ball = new Ball();
            ball._id = Over.Balls.length + 1;
            ball.BatsmanID = Inning.ActivePlayers.FacingBatsman;
            ball.Players = bowler;
            ball.Score = Score;
            ball.Details = ballCode;
            
            Over.Balls.push(ball);
            if ([ BallCodes.Normal, BallCodes.Four, BallCodes.Six ].indexOf(ballCode) !== -1)
                Inning.TotalEffectiveBalls++;
            
            var Bowler = Inning.Teams.Bowling.Players.id(bowler);
            var Batsman = Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman);
            Batsman.Score += Score;
            Batsman.BallsFaced++;
            
            if (ballCode === BallCodes.NoBall)
                Bowler.NoBall++;
            else if (ballCode === BallCodes.Wide)
                Bowler.Wide++;
            else {
                Bowler.BallsDelivered++;
                Batsman.EffectiveBalls++;
                if (ballCode === BallCodes.Four)
                    Batsman.Fours++;
                else if (ballCode === BallCodes.Six)
                    Batsman.Six++;
            }
            
            Inning.ActivePlayers.Bowler = bowler;
            if (switchSides) {
                var temp = Inning.ActivePlayers.FacingBatsman;
                Inning.ActivePlayers.FacingBatsman = Inning.ActivePlayers.OtherBatsman;
                Inning.ActivePlayers.OtherBatsman = temp;
            }
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

var Inning = mDb.model('Inning', InningsSchema);
var Match = mDb.model('Match', MatchSchema);
var Bowler = mDb.model('Bowler', BowlerSchema);
var Batsman = mDb.model('Batsman', BatsmanSchema);
var Wicket = mDb.model('Wicket', WicketSchema);
var Over = mDb.model('Over', OverSchema);
var Ball = mDb.model('Ball', BallSchema);

/**Get Match By ID**/
Match.getMatch = function (MatchID) {
    return Match.findById(MatchID)
        .then(function (game) {
            if (game)
                return game;
            
            var newGame = new Match();
            newGame._id = MatchID;
            
            return newGame;
        });
};

/**Start New Match**/
Match.startMatch = function (MatchID, BattingTeam, BowlingTeam, TossWinner) {
    return Match.getMatch(MatchID)
        .then(function (game) {
            game.StartTime = new Date();
            game.Teams = [ BattingTeam, BowlingTeam ];
            game.TossWinner = TossWinner;
            
            return game.setInitialInningsData(1, BattingTeam, BowlingTeam)
                .then(function () {
                    return game;
                });
        });
};

module.exports = Match;

/**
 * Usage
 *
 * 1. start Match
 * 2. set initial innings data
 * 3. set openers
 *
 * 4. Score / Player Out
 *
 * 5. Next Innings
 *
 * 6. Score / Player Out
 *
 * 7. End match
 * **/