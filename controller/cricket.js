/**
 * Created by Home Laptop on 15-Jul-17.
 */
'use strict';

var Schema = require('../model/cricket');

/**Find an Inning by ID**/
Schema.MatchSchema.methods.findInnings = function (InningsID) {
    var game = this;
    return createPromise()
        .then(function () {
            
            if (game.Innings.id(InningsID))
                return game.Innings.id(InningsID);
            
            var newInning = new Inning();
            newInning._id = InningsID;
            game.Innings.push(newInning);
            
            return game.Innings.id(newInning._id);
        });
};

/**Find an Over by ID**/
Schema.MatchSchema.methods.findOver = function (Inning, OverID) {
    if (Inning.Overs.id(OverID))
        return Inning.Overs.id(OverID);
    var newOver = new Over();
    newOver._id = OverID;
    Inning.Overs.push(newOver);
    return Inning.Overs.id(newOver._id);
};

/**End a match**/
Schema.MatchSchema.methods.endMatch = function () {
    var game = this;
    game.EndTime = new Date();
    
    if (game.Innings.length > 1) {
        if (game.Innings[ 0 ].TotalScore > game.Innings[ 1 ].TotalScore)
            game.Result = game.Innings[ 0 ].Teams.Batting.ID;
        else if (game.Innings[ 0 ].TotalScore < game.Innings[ 1 ].TotalScore)
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
Schema.MatchSchema.methods.setInitialInningsData = function (InningsID, BattingTeam, BowlingTeam) {
    var game = this;
    return this.findInnings(InningsID)
        .then(function (Inning) {
            Inning.Teams.Batting.ID = BattingTeam;
            Inning.Teams.Bowling.ID = BowlingTeam;
            /*Todo: Fill with Team Data*/
            var P1 = [ "123", "456", "789", "1245", "987", "654" ];
            var P2 = [ "345", "476", "567", "6789", "786", "980" ];
            var Player, Index;
            for (Index in P1) {
                Player = new Batsman();
                Player._id = P1[ Index ];
                Inning.Teams.Batting.Players.push(Player);
            }
            for (Index in P2) {
                Player = new Bowler();
                Player._id = P2[ Index ];
                Inning.Teams.Bowling.Players.push(Player);
            }
            
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

/**Set on Starting of Inning**/
Schema.MatchSchema.methods.setOpeners = function (InningsID, FacingBatsMan, OtherBatsman, Bowler) {
    var game = this;
    InningsID = InningsID || game.Innings[ game.Innings.length - 1 ]._id;
    return this.findInnings(InningsID)
        .then(function (Inning) {
            Inning.ActivePlayers.FacingBatsman = FacingBatsMan;
            Inning.ActivePlayers.OtherBatsman = OtherBatsman;
            Inning.ActivePlayers.Bowler = Bowler;
            
            if (!Inning.Teams.Batting.Players.id(FacingBatsMan) || !Inning.Teams.Batting.Players.id(OtherBatsman) || !Inning.Teams.Bowling.Players.id(Bowler))
                return;
            
            if (Inning.Teams.Batting.Order.indexOf(FacingBatsMan) === -1)
                Inning.Teams.Batting.Order.push(FacingBatsMan);
            if (Inning.Teams.Batting.Order.indexOf(OtherBatsman) === -1)
                Inning.Teams.Batting.Order.push(OtherBatsman);
            return game.save()
                .then(function () {
                    return game;
                });
        });
};

/**Move to Next Innings**/
Schema.MatchSchema.methods.nextInnings = function () {
    var game = this;
    return createPromise()
        .then(function () {
            var oldInning = game.Innings[ game.Innings.length - 1 ];
            var newInning = new Inning();
            
            newInning._id = game.Innings.length + 1;
            newInning.Teams.Batting.ID = oldInning.Teams.Bowling.ID;
            newInning.Teams.Bowling.ID = oldInning.Teams.Batting.ID;
            newInning.TargetScore = oldInning.TotalScore + 1;
            
            var x, Player;
            
            for (x = 0; x < oldInning.Teams.Batting.Players.length; x++) {
                Player = new Bowler();
                Player._id = oldInning.Teams.Batting.Players[ x ]._id;
                newInning.Teams.Bowling.Players.push(Player);
            }
            
            for (x = 0; x < oldInning.Teams.Bowling.Players.length; x++) {
                Player = new Batsman();
                Player._id = oldInning.Teams.Bowling.Players[ x ]._id;
                newInning.Teams.Batting.Players.push(Player);
            }
            
            game.Innings.push(newInning);
            
            return game.save()
                .then(function () {
                    return game.Innings.id(newInning._id);
                });
        });
};

/**Player Gets Out**/
Schema.MatchSchema.methods.playerOut = function (InningsID, OverId, PlayerOut, NewFacingPlayer, NewOtherPlayer, OutReason, ReasonPlayerID, newBowler) {
    var game = this;
    InningsID = InningsID || game.Innings[ game.Innings.length - 1 ]._id;
    return game.findInnings(InningsID)
        .then(function (Inning) {
            
            if (PlayerOut !== Inning.ActivePlayers.FacingBatsman && PlayerOut !== Inning.ActivePlayers.OtherBatsman)
                return;
            
            Inning.ActivePlayers.FacingBatsman = NewFacingPlayer;
            Inning.ActivePlayers.OtherBatsman = NewOtherPlayer;
            
            if ((newBowler && !Inning.Teams.Bowling.Players.id(newBowler)) || !Inning.Teams.Bowling.Players.id(ReasonPlayerID))
                return;
            
            if (newBowler)
                Inning.ActivePlayers.Bowler = newBowler;
            
            if (!Inning.Teams.Batting.Players.id(NewFacingPlayer) || !Inning.Teams.Batting.Players.id(NewOtherPlayer))
                return;
            
            if (Inning.Teams.Batting.Order.indexOf(NewFacingPlayer) === -1)
                Inning.Teams.Batting.Order.push(NewFacingPlayer);
            else Inning.Teams.Batting.Order.push(NewOtherPlayer);
            
            var OutPlayer = Inning.Teams.Batting.Players.id(PlayerOut);
            OutPlayer.BallsFaced++;
            OutPlayer.EffectiveBalls++;
            OutPlayer.BowlerIDWhenOut = Inning.ActivePlayers.Bowler;
            OutPlayer.FallOfWicketReason = OutReason;
            OutPlayer.FallOfWicketPlayerID = ReasonPlayerID;
            
            var Bowler = Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler);
            
            OverId = OverId || Math.floor(Inning.TotalEffectiveBalls / 6) + 1;
            var Over = game.findOver(Inning, OverId);
            
            Inning.TotalEffectiveBalls++;
            Inning.TotalBalls++;
            Inning.FallenWickets++;
            
            var wicket = new Wicket();
            wicket._id = Bowler.Wickets.length + 1;
            var BallID = (Inning.TotalEffectiveBalls % 6);
            if (BallID === 0) BallID = 6;
            wicket.OverID = Over._id + "." + BallID;
            wicket.BatsmanID = OutPlayer;
            
            Bowler.Wickets.push(wicket);
            Bowler.BallsDelivered++;
            
            var newBall = new Ball();
            newBall._id = Over.Balls.length + 1;
            newBall.BatsmanID = Inning.ActivePlayers.FacingBatsman;
            newBall.BowlerID = Bowler;
            newBall.Details = Schema.BallCodes.Out;
            newBall.OutID = OutPlayer;
            Over.Balls.push(newBall);
            
            return game.save()
                .then(function () {
                    return Inning;
                });
        });
};

/**Normal Score**/
Schema.MatchSchema.methods.Score = function (InningsID, ballCode, OverId, Score, switchSides, newBowler) {
    var game = this;
    ballCode = parseInt(ballCode);
    InningsID = InningsID || game.Innings[ game.Innings.length - 1 ]._id;
    return game.findInnings(InningsID)
        .then(function (Inning) {
            
            if (ballCode === Schema.BallCodes.Wide)
                Score++;
            
            Inning.TotalScore += parseInt(Score);
            Inning.TotalBalls++;
            
            OverId = OverId || Math.floor(Inning.TotalEffectiveBalls / 6) + 1;
            var Over = game.findOver(Inning, OverId);
            
            var ball = new Ball();
            ball._id = Over.Balls.length + 1;
            ball.BatsmanID = Inning.ActivePlayers.FacingBatsman;
            ball.BowlerID = Inning.ActivePlayers.Bowler;
            ball.Score = Score;
            ball.Details = ballCode;
            Over.Balls.push(ball);
            
            if ([ Schema.BallCodes.Normal, Schema.BallCodes.Four, Schema.BallCodes.Six ].indexOf(parseInt(ballCode)) !== -1)
                Inning.TotalEffectiveBalls++;
            
            var Bowler = Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler);
            var Batsman = Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman);
            
            Batsman.Score += parseInt(Score);
            Batsman.BallsFaced++;
            
            if (ballCode === Schema.BallCodes.NoBall)
                Bowler.NoBalls++;
            else if (ballCode === Schema.BallCodes.Wide)
                Bowler.Wides++;
            else {
                Bowler.BallsDelivered++;
                Batsman.EffectiveBalls++;
                if (ballCode === Schema.BallCodes.Four)
                    Batsman.Fours++;
                else if (ballCode === Schema.BallCodes.Six)
                    Batsman.Six++;
            }
            
            if (newBowler) {
                if (!Inning.Teams.Bowling.Players.id(newBowler))
                    return;
                Inning.ActivePlayers.Bowler = newBowler;
            }
            
            if (switchSides && parseInt(switchSides)) {
                var temp = Inning.ActivePlayers.FacingBatsman;
                Inning.ActivePlayers.FacingBatsman = Inning.ActivePlayers.OtherBatsman;
                Inning.ActivePlayers.OtherBatsman = temp;
            }
            return game.save()
                .then(function () {
                    return Inning;
                });
        });
};

var Inning = mDb.model('Inning', Schema.InningsSchema);
var Match = mDb.model('Match', Schema.MatchSchema);
var Bowler = mDb.model('Bowler', Schema.BowlerSchema);
var Batsman = mDb.model('Batsman', Schema.BatsmanSchema);
var Wicket = mDb.model('Wicket', Schema.WicketSchema);
var Over = mDb.model('Over', Schema.OverSchema);
var Ball = mDb.model('Ball', Schema.BallSchema);

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
            game.Innings = [];
            
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
 * 1. Start Match
 * 2. Set Openers
 *
 * 3. Score / Player Out
 *
 * 4. Next Innings
 * 5. Set Openers
 *
 * 6. Score / Player Out
 *
 * 7. End match
 *
 * **/