/**
 * Created by Home Laptop on 15-Jul-17.
 */
'use strict';

var request = require('request-promise');

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
            
            return request(getOptions(BattingTeam))
                .then(function (data) {
                    for (var Index = 0; Index < data.length; Index++) {
                        var Player = new Batsman();
                        Player._id = data[ Index ][ 'UserId' ];
                        Inning.Teams.Batting.Players.push(Player);
                    }
                    return request(getOptions(BowlingTeam))
                        .then(function (data) {
                            for (var Index = 0; Index < data.length; Index++) {
                                Player = new Bowler();
                                Player._id = data[ Index ][ 'UserId' ];
                                Inning.Teams.Bowling.Players.push(Player);
                            }
                            return game.save()
                                .then(function () {
                                    return game;
                                });
                        })
                        .catch(function (e) {
                            console.log(e);
                        });
                })
                .catch(function (e) {
                    console.log(e);
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
            
            if (!Inning.Teams.Batting.Players.id(FacingBatsMan) || !Inning.Teams.Batting.Players.id(OtherBatsman)
                || !Inning.Teams.Bowling.Players.id(Bowler))
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

function getOptions(teamID) {
    return {
        method : 'POST',
        uri : 'http://test.sportsocial.in/team/getTeamPlayersId',
        body : [ { teamid : teamID } ],
        json : true
    };
}

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
Schema.MatchSchema.methods.playerOut = function (InningsID, BallCode, PlayerOut, NewFacing, NewOther, NewBowler, OutReasonCode, OutReasonID) {
    var game = this;
    InningsID = InningsID || game.Innings[ game.Innings.length - 1 ]._id;
    BallCode = parseInt(BallCode);
    OutReasonCode = parseInt(OutReasonCode);
    
    return game.findInnings(InningsID)
        .then(function (Inning) {
            var oldPlayers = [ Inning.ActivePlayers.FacingBatsman, Inning.ActivePlayers.OtherBatsman ];
            
            if (oldPlayers.indexOf(PlayerOut) === -1 || (oldPlayers.indexOf(NewFacing) === -1 && oldPlayers.indexOf(NewOther) === -1)
                || (NewFacing && !Inning.Teams.Batting.Players.id(NewFacing)) || (NewOther && !Inning.Teams.Batting.Players.id(NewOther)))
                return;
            if (NewBowler && !Inning.Teams.Bowling.Players.id(NewBowler))
                return;
            if (OutReasonID && !Inning.Teams.Bowling.Players.id(OutReasonID))
                return;
            
            if (Inning.Wickets.id(NewFacing) || Inning.Wickets.id(NewOther))
                return;
            
            if (!NewFacing && !NewOther)
                return;
            
            var Batsman = Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman);
            var Bowler = Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler);
            
            if (NewBowler) {
                if (Inning.Teams.Bowling.Players.id(NewBowler))
                    Bowler = Inning.Teams.Bowling.Players.id(NewBowler);
                else return;
            }
            
            Inning.TotalBalls++;
            Batsman.BallsFaced++;
            
            var ball = new Ball();
            ball._id = Inning.TotalBalls;
            ball.BowlerID = Inning.ActivePlayers.Bowler;
            ball.Details = Schema.BallCodes.Out;
            ball.BatsmanID = Inning.ActivePlayers.FacingBatsman;
            ball.OutID = PlayerOut;
            
            if (BallCode === Schema.BallCodes.NoBall) {
                Bowler.NoBall++;
            }
            
            else if (BallCode === Schema.BallCodes.Wide) {
                Bowler.Wides++;
            }
            else {
                Bowler.BallsDelivered++;
                Batsman.EffectiveBalls++;
                Inning.TotalEffectiveBalls++;
                ball.BallNo = (Inning.TotalEffectiveBalls % 6);
                if (ball.BallNo === 0) ball.BallNo = 6;
            }
            
            if (Inning.TotalEffectiveBalls % 6 !== 0)
                ball.Over = Math.floor(Inning.TotalEffectiveBalls / 6);
            else ball.Over = Math.floor(Inning.TotalEffectiveBalls / 6) - 1;
            
            Inning.Balls.push(ball);
            Inning.ActivePlayers.FacingBatsman = NewFacing;
            Inning.ActivePlayers.OtherBatsman = NewOther;
            
            if (NewBowler)
                Inning.ActivePlayers.Bowler = NewBowler;
            
            var wicket = new Wicket();
            wicket._id = PlayerOut;
            var BallID = (Inning.TotalEffectiveBalls % 6);
            if (BallID === 0) BallID = 6;
            wicket.OverID = Math.floor(Inning.TotalEffectiveBalls / 6) + "." + BallID;
            wicket.BatsmanID = PlayerOut;
            wicket.BowlerID = Bowler;
            wicket.BallNo = Inning.TotalBalls;
            
            Bowler.Wickets.push(wicket._id);
            
            Inning.Wickets.push(wicket);
            
            if (Inning.Teams.Batting.Order.indexOf(NewFacing) === -1)
                Inning.Teams.Batting.Order.push(NewFacing);
            else Inning.Teams.Batting.Order.push(NewOther);
            
            PlayerOut = Inning.Teams.Batting.Players.id(PlayerOut);
            PlayerOut.BowlerIDWhenOut = Bowler._id;
            PlayerOut.FallOfWicketReason = OutReasonCode;
            PlayerOut.FallOfWicketPlayerID = OutReasonID;
            
            return game.save()
                .then(function () {
                    return Inning;
                });
        });
};

/**Normal Score**/
Schema.MatchSchema.methods.Score = function (InningsID, ballCode, Score, AdditionalCode, newBowler) {
    var game = this;
    ballCode = parseInt(ballCode);
    AdditionalCode = parseInt(AdditionalCode);
    Score = parseInt(Score);
    InningsID = InningsID || game.Innings[ game.Innings.length - 1 ]._id;
    
    return game.findInnings(InningsID)
        .then(function (Inning) {
            Inning.TotalBalls++;
            
            var Batsman = Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman);
            var Bowler = Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler);
            
            if (newBowler) {
                if (Inning.Teams.Bowling.Players.id(newBowler))
                    Bowler = Inning.Teams.Bowling.Players.id(newBowler);
                else return;
            }
            
            Batsman.BallsFaced++;
            
            var ball = new Ball();
            ball._id = Inning.TotalBalls;
            ball.BowlerID = Inning.ActivePlayers.Bowler;
            ball.Details = ballCode;
            ball.BatsmanID = Inning.ActivePlayers.FacingBatsman;
            
            
            if (ballCode === Schema.BallCodes.DeadBall) {
                Bowler.DeadBall++;
            }
            
            else if (ballCode === Schema.BallCodes.NoBall) {
                Inning.TotalScore += 1 + Score;
                Bowler.Score += 1 + Score;
                Bowler.NoBall++;
                Inning.Extras++;
                
                if (AdditionalCode === Schema.AdditionalCode.Bat) {
                    Batsman.Score += Score;
                    Batsman.TotalEffectiveBalls++;
                }
                else if (AdditionalCode === Schema.AdditionalCode.LegBye || AdditionalCode === Schema.AdditionalCode.Bye) {
                    Inning.Extras += Score;
                    Batsman.TotalEffectiveBalls++;
                }
                
                ball.Score = 1 + Score;
            }
            
            else if (ballCode === Schema.BallCodes.Wide) {
                Inning.TotalScore += 1 + Score;
                Inning.Extras += 1 + Score;
                Bowler.Score += 1 + Score;
                Bowler.Wide++;
                
                ball.Score = 1 + Score;
            }
            
            else if (ballCode !== Schema.BallCodes.Out) {
                Inning.TotalScore += Score;
                Bowler.BallsDelivered++;
                Inning.TotalEffectiveBalls++;
                Batsman.EffectiveBalls++;
                
                ball.Score = Score;
                
                ball.BallNo = (Inning.TotalEffectiveBalls % 6);
                if (ball.BallNo === 0) ball.BallNo = 6;
                
                Bowler.Score += Score;
                
                if ([ Schema.AdditionalCode.Bye, Schema.AdditionalCode.LegBye ].indexOf(AdditionalCode) === -1) {
                    Batsman.Score += Score;
                    if (ballCode === Schema.BallCodes.Six)
                        Batsman.Sixes++;
                    else if (ballCode === Schema.BallCodes.Four)
                        Batsman.Fours++;
                }
                else {
                    Inning.Extras += Score;
                }
                
                if (Inning.TotalEffectiveBalls % 6 === 0) {
                    var Temp = Inning.ActivePlayers.FacingBatsman;
                    Inning.ActivePlayers.FacingBatsman = Inning.ActivePlayers.OtherBatsman;
                    Inning.ActivePlayers.OtherBatsman = Temp;
                }
            }
            
            else return;
            
            if (Score % 2 === 1) {
                var Temp = Inning.ActivePlayers.FacingBatsman;
                Inning.ActivePlayers.FacingBatsman = Inning.ActivePlayers.OtherBatsman;
                Inning.ActivePlayers.OtherBatsman = Temp;
            }
            
            if (Inning.TotalEffectiveBalls % 6 !== 0)
                ball.Over = Math.floor(Inning.TotalEffectiveBalls / 6);
            else ball.Over = Math.floor(Inning.TotalEffectiveBalls / 6) - 1;
            
            Inning.Balls.push(ball);
            
            return game.save()
                .then(function () {
                    return Inning;
                });
        });
};

var Inning = mDb.model('Inning', Schema.InningsSchema);
var Match = mDb.model('Cricket', Schema.MatchSchema, 'Cricket');
var Bowler = mDb.model('Bowler', Schema.BowlerSchema);
var Batsman = mDb.model('Batsman', Schema.BatsmanSchema);
var Wicket = mDb.model('Wicket', Schema.WicketSchema);
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
