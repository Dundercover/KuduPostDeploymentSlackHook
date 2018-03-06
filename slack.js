var https                   = require('https');
var url                     = require('url');
var slackHookRequestOptions = getSlackHookRequestOptions();
module.exports.sendToSlack  = sendToSlack;

function getSlackHookRequestOptions()
{
    var hookUri     =   url.parse(process.env.slackhookuri);
    return {
        host:       hookUri.hostname,
        port:       hookUri.port,
        path:       hookUri.path,
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

        var error           = false;
        var slackMessage    = convertToSlackMessage(parsedRequest.body, parsedRequest.channel);
        var req             = https.request(slackHookRequestOptions);

        req.on('error', function(e) {
            console.error(e);
            error = true;
        });

        req.on('close', function() { callback(error); } );

        req.write(slackMessage);
        req.end();
}

function convertToSlackMessage(body, channel)
{
    var parsedBody  = trParseBody(body);
    var success     = (parsedBody.status==='success' && parsedBody.complete);
    
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

function getSlackUserName(parsedBody, success)
{
    return (
        (success ? 'Published:': 'Failed:') +
        ' ' +
        (parsedBody.siteName || 'unknown')
    );
}

function getSlackText(parsedBody, success)
{
    if (!success) {
        return 'Buildy boi failed, go fish!';
    }

    return (
        (parsedBody.siteName ? '<http://' + parsedBody.siteName + '.azurewebsites.net|Browse site>' : '') +
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
