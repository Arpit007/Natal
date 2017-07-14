/**
 * Created by Home Laptop on 14-Jul-17.
 */
'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');

mongoose.Promise = Promise;

global.mDb = mongoose.connect("mongodb://localhost:27017/Natal");

global.createPromise = function () {
    return new Promise(function (resolve, reject) {
        resolve({});
    });
};
