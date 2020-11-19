const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1'
});

function getResultsFromDataSource(resourceData, table){
    
    return new Promise(function(resolve){
        var resultValue = 0;
        var params = {
            TableName: table, 
        
            FilterExpression: "#key = :data" ,
            ExpressionAttributeNames: {
                "#key": "Greetings",
            },
            ExpressionAttributeValues: {
                ":data" : resourceData
            }
        };
    
        db.scan(params, function(err, data){
            if(err){
                console.log("Error: "+err);
                resultValue =0;
            }
            else {
                console.log("Success", data);
            
                resultValue = {'Response':data.Items[0].Response};
            }
            resolve(resultValue);
        });
    });
}

exports.handler = async (event, context, callback) => {
    var greeting = event.currentIntent.slots.greetings;
    var resultValue = await getResultsFromDataSource(greeting, "Gen_Greetings");
    var res;
    if ( resultValue !== 0) {
        res = ` ${resultValue.Response}`;
    }
    else {
        res = 'Unable to answer your question, please try again.' + resultValue.Response;
    }
    
    callback(null, {
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": "Fulfilled",
            "message": {
                "contentType": "PlainText",
                "content": res
            }
        }
    });
};
