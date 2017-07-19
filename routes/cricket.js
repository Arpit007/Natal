/**
 * Created by Home Laptop on 15-Jul-17.
 */
var express = require('express');
var router = express.Router();

var cricket = require('../controller/cricket');

router.get('/', function (req, res) {
    res.end('Natal: Cricket');
});

/*Get Match Details*/
router.post('/details', function (req, res) {
    if (!req.body.MatchID) {
        res.json({ Head : { Code : 400, Message : "Natal: Cricket" } });
        return;
    }
    cricket.getMatch(req.body.MatchID)
        .then(function (game) {
            var Inning = game.Innings[ game.Innings.length - 1 ];
            var Body = {
                GameID : game._id,
                Teams : game.Teams,
                StartTime : game.StartTime,
                EndTime : game.EndTime
            };
            
            if (Inning) {
                Body.InningsID = Inning._id;
                Body.BattingTeam = Inning.Teams.Batting;
                Body.BowlingTeam = Inning.Teams.Bowling;
                Body.Score = Inning.TotalScore;
                Body.Extras = Inning.Extras;
                Body.TargetScore = Inning.TargetScore;
                Body.Wickets = Inning.Wickets.length;
                Body.OverID = Math.floor(Inning.TotalEffectiveBalls / 6);
                Body.Balls = Inning.TotalEffectiveBalls % 6;
                Body.FacingBatsman = Inning.ActivePlayers.FacingBatsman;
                Body.OtherBatsman = Inning.ActivePlayers.OtherBatsman;
                Body.Bowler = Inning.ActivePlayers.Bowler;
            }
            res.json({
                Head : { Code : 200, Message : "Success" },
                Body : Body
            });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**Create match
 * @param MatchID, BattingTeam, BowlingTeam, TossWinner
 **/
router.post('/create', function (req, res) {
    var data = getStartData(req.body);
    if (!data) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.createMatch(data.MatchID, data.BattingTeam, data.BowlingTeam, data.TossWinner)
        .then(function (game) {
            if (game) {
                res.json({
                    Head : { Code : 200, Message : "Success" },
                    Body : {
                        InningsID : 1,
                        OverID : 1
                    }
                });
            }
            else res.json({ Head : { Code : 400, Message : "Failed" } });
        })
        .catch(function (e) {
            console.log(e);
            res.json({ Head : { Code : 400, Message : "Failed" } });
        });
});

/**Start match
 * @param MatchID
 **/
router.post('/start', function (req, res) {
    if (!req.body.MatchID) {
        res.json({ Head : { Code : 400, Message : "Missing Fields" } });
        return;
    }
    cricket.getMatch(req.body.MatchID)
        .then(function (game) {
            game.StartTime = new Date();
            
            return game.save()
                .then(function () {
                    res.json({
                        Head : { Code : 200, Message : "Success" },
                        Body : {
                            StartTime : game.StartTime
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
    if (data.Score !== 'undefined')
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
        Bowler : Inning.Teams.Bowling.Players.id(Inning.ActivePlayers.Bowler),
        Facing : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.FacingBatsman),
        Other : Inning.Teams.Batting.Players.id(Inning.ActivePlayers.OtherBatsman)
    };
    
    return data;
};

module.exports = router;