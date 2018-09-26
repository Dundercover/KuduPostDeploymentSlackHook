var https = require('https');
var url = require('url');
module.exports.sendToSlack  = sendToSlack;

function getSiteUri(parsedBody)
{
    return process.env[parsedBody.siteName + '_siteuri'];
}

function getSlackhookUri(parsedBody)
{
    return process.env[parsedBody.siteName + '_slackhookuri'];
}

function getSlackHookRequestOptions(parsedBody)
{
    var slackhookUri = getSlackhookUri(parsedBody);
    var parsedUri = url.parse(slackhookUri);

    return {
        host:       parsedUri.hostname,
        port:       parsedUri.port,
        path:       parsedUri.path,
        method:     'POST',
        headers:    { 'Content-Type': 'application/json' }
    };
}

function sendToSlack(parsedRequest, callback)
{
    if (!parsedRequest || (parsedRequest.body||'').trim()=='') {
        callback(true);
        return;
    }

    var parsedBody = trParseBody(parsedRequest.body);
    var success = (parsedBody.status==='success' && parsedBody.complete);

    var slackMessage = convertToSlackMessage(parsedRequest.body, success);

    var req = https.request(getSlackHookRequestOptions(parsedBody));
    var reqError = false;

    req.on('error', function(e) {
        console.error(e);
        reqError = true;
    });

    req.on('close', function() { callback(reqError); } );

    req.write(slackMessage);
    req.end();
}

function convertToSlackMessage(parsedBody, success)
{
    return JSON.stringify({
        text: getSlackText(parsedBody, success)
    });
}

function trParseBody(body)
{
    try
    {
        return JSON.parse(body) || {
            status: 'failed',
            complete: false
        };
    } catch(err) {
        console.error(err);
        return {
            status: err,
            complete: false
        };
    }
}

function getSlackText(parsedBody, success)
{
    if (!success) {
        return 'Buildy boi failed, go fish!';
    }
    
    var siteUri = getSiteUri(parsedBody);

    return (
        '<' + siteUri + '|Browse site>' +
        '\r\n' +
        'Automatically deployed on ' + (parsedBody.endTime || 'unknown date and time') +
        '\r\n' +
        'Latest commit by ' + (parsedBody.author || 'unknown user') + ' with the following message: ' +
        '\r\n' +
        '```' +
        (parsedBody.message || 'Empty message') +
        '```'
    );
}
