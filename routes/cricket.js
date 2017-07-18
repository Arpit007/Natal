/**
 * Created by Home Laptop on 15-Jul-17.
 */
var express = require('express');
var router = express.Router();

var cricket = require('../controller/cricket');

/**Start match
 * @param MatchID, BattingTeam, BowlingTeam, TossWinner
 **/
router.post('/start', function (req, res) {
    var data = getStartData(req.body);
    if (!data) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.startMatch(data.MatchID, data.BattingTeam, data.BowlingTeam, data.TossWinner)
        .then(function () {
            res.json({
                Head : { Code : 200, Message : "Success" },
                Body : {
                    InningsID : 1,
                    OverID : 1
                }
            });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**
 * End Match
 * @param MatchID
 **/
router.post('/end', function (req, res) {
    if (!req.body.MatchID) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(req.body.MatchID)
        .then(function (game) {
            if (!game.StartTime) {
                res.json({ Head : { Code : 400, Message : "Start Match First" } });
                return;
            }
            return game.endMatch()
                .then(function () {
                    res.json({
                        Head : { Code : 200, Message : "Success" },
                        Body : { Result : game.Result }
                    });
                });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**
 * Next Inning
 * @param MatchID
 **/
router.post('/nextInning', function (req, res) {
    if (!req.body.MatchID) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(req.body.MatchID)
        .then(function (game) {
            if (!game.StartTime) {
                res.json({ Head : { Code : 400, Message : "Start Match First" } });
                return;
            }
            return game.nextInnings()
                .then(function (Inning) {
                    res.json({
                        Head : { Code : 200, Message : "Success" },
                        Body : {
                            InningsID : Inning._id,
                            OverID : 1,
                            Batting : Inning.Teams.Batting.ID,
                            Bowling : Inning.Teams.Bowling.ID
                        }
                    });
                });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**
 * Set Inning Openers
 * @param MatchID, InningsID(Not Mandatory), FacingBatsman, OtherBatsman, Bowler
 * */
router.post('/setOpeners', function (req, res) {
    var data = getOpenersData(req.body);
    if (!data) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(data.MatchID)
        .then(function (game) {
            if (!game.StartTime) {
                res.json({ Head : { Code : 400, Message : "Start Match First" } });
                return;
            }
            return game.setOpeners(data.InningsID, data.FacingBatsman, data.OtherBatsman, data.Bowler)
                .then(function (game) {
                    if (game)
                        res.json({ Head : { Code : 200, Message : "Success" } });
                    else res.json({ Head : { Code : 400, Message : "Failed" } });
                });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**
 * Score
 * @param  MatchID, InningsID(Not Mandatory), BallCode, Score, AdditionalCode(Not Mandatory), NewBowler(Not Mandatory)
 * */
router.post('/score', function (req, res) {
    var data = getScoreData(req.body);
    if (!data) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(data.MatchID)
        .then(function (game) {
            return game.Score(data.InningsID, data.BallCode, data.Score, data.AdditionalCode, data.NewBowler)
                .then(function (Inning) {
                    res.json({
                        Head : { Code : 200, Message : "Success" },
                        Body : getData(Inning)
                    });
                });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**
 * Player Out
 * @param MatchID, InningsID(Not Mandatory), PlayerOut, NewFacingPlayer,
 *        NewOtherPlayer, OutReason(Not Mandatory), ReasonPlayerID, NewBowler(Not Mandatory)
 * */
router.post('/out', function (req, res) {
    var data = getOutData(req.body);
    if (!data) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(data.MatchID)
        .then(function (game) {
            return game.playerOut(data.InningsID, data.BallCode, data.PlayerOut, data.NewFacingPlayer,
                data.NewOtherPlayer, data.NewBowler, data.OutReason, data.ReasonPlayerID)
                .then(function (Inning) {
                    if (Inning) {
                        res.json({
                            Head : { Code : 200, Message : "Success" },
                            Body : getData(Inning)
                        });
                    }
                    else res.json({ Head : { Code : 400, Message : "Failed" } });
                });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

function getStartData(data) {
    var Data = {};
    if (data.MatchID)
        Data.MatchID = data.MatchID;
    else return false;
    if (data.BattingTeam)
        Data.BattingTeam = data.BattingTeam;
    else return false;
    if (data.BowlingTeam)
        Data.BowlingTeam = data.BowlingTeam;
    else return false;
    if (data.TossWinner)
        Data.TossWinner = data.TossWinner;
    else return false;
    return Data;
}

function getOpenersData(data) {
    var Data = {};
    if (data.MatchID)
        Data.MatchID = data.MatchID;
    else return false;
    Data.InningsID = data.InningsID;
    if (data.FacingBatsman)
        Data.FacingBatsman = data.FacingBatsman;
    else return false;
    if (data.OtherBatsman)
        Data.OtherBatsman = data.OtherBatsman;
    else return false;
    if (data.Bowler)
        Data.Bowler = data.Bowler;
    else return false;
    return Data;
}

function getScoreData(data) {
    var Data = {};
    if (data.MatchID)
        Data.MatchID = data.MatchID;
    else return false;
    Data.InningsID = data.InningsID;
    if (data.BallCode)
        Data.BallCode = data.BallCode;
    else return false;
    Data.AdditionalCode = data.AdditionalCode;
    if (data.Score)
        Data.Score = data.Score;
    else return false;
    Data.NewBowler = data.NewBowler;
    return Data;
}

function getOutData(data) {
    var Data = {};
    if (data.MatchID)
        Data.MatchID = data.MatchID;
    else return false;
    Data.InningsID = data.InningsID;
    if (data.PlayerOut)
        Data.PlayerOut = data.PlayerOut;
    else return false;
    if (data.BallCode)
        Data.BallCode = data.BallCode;
    else return false;
    Data.NewFacingPlayer = data.NewFacingPlayer;
    Data.NewOtherPlayer = data.NewOtherPlayer;
    Data.OutReason = data.OutReason;
    if (data.ReasonPlayerID)
        Data.ReasonPlayerID = data.ReasonPlayerID;
    else return false;
    Data.NewBowler = data.NewBowler;
    return Data;
}

var getData = function (Inning) {
    var data = {
        InningsID : Inning._id,
        OverID : Math.floor(Inning.TotalEffectiveBalls / 6),
        Balls : Inning.TotalEffectiveBalls % 6,
        Score : Inning.TotalScore,
        Wickets : Inning.Wickets.length,
        Bowler : {
            ID : Inning.ActivePlayers.Bowler,
            Balls : Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler).BallsDelivered,
            Score : Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler).Score,
            Wickets : Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler).Wickets.length
        }
    };
    
    if (Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman))
        data.Facing = {
            ID : Inning.ActivePlayers.FacingBatsman,
            Score : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman).Score,
            Balls : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman).EffectiveBalls
        };
    
    if (Inning.Teams.Batting.Players.id(Inning.ActivePlayers.OtherBatsman))
        data.Other = {
            ID : Inning.ActivePlayers.OtherBatsman,
            Score : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.OtherBatsman).Score,
            Balls : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.OtherBatsman).EffectiveBalls
        };
    return data;
};

module.exports = router;