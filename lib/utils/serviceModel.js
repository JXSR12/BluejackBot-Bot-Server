const { query } = require('../database');
const { replyMessage } = require('../line_helper');

exports.formatData = (data, formatterKey) => {
    /*
    * This is the section to register any kind of data formatter.
    * The 'formatterKey' is the ID/Key of the formatter which is specified in the column 'service_state_data_format' on certain states, mainly OUTPUT states.
    */

    //An example of a formatter for printing the items in the data as List, with name and description
    switch (formatterKey) {
        case 'ITEM_LIST_01': {
            //Return the formatted message
            let message = '';

            if(!data || !data.items){
                message = 'ERROR: Formatting error (Invalid data items)'
                return message;
            }else if(data.items.length < 1){
                message = 'No data to display'
                return message;
            }
    
            //For each 'item' in data.items
            data.items.forEach(item => {
                message += `* ${item.name}\n  >> ${item.description}\n\n`;
            });
    
            return message;
        }
    
        default: {
            // The default is the same as if 'PLAINTEXT' is the key
            // Return the stringified raw data without surrounding quotes
            let result = JSON.stringify(data);
            return result.replace(/^"|"$/g, '');
        }        
    }
    
}

exports.getServiceState = async (stateId) => {
    sql = 'SELECT * FROM service_states WHERE service_state_id = ?';
    let states = await query(sql, [stateId]);

    if (states.length === 0) {
        throw new Error('Initial state not found');
    }
    return states[0];
}

exports.evaluateCondition = async (condition, test) => {
    let type = condition.service_condition_type;
    let value = condition.service_condition_value;

    if (type === 'NONE') {
        return true;
    } else if (type === 'SIMPLE_EQUALS') {
        //Return 'true' if the test matches the value (string equals - case sensitive)
        return test === value;
    } else if (type === 'SIMPLE_CONTAINS') {
        //Return 'true' if the test matches the value (string contains - case sensitive)
        return test.includes(value);
    } else if (type === 'MATCH_REGEX') {
        //Return 'true' if the test matches the value (the value will be a regex pattern to match)
        let regex = new RegExp(value);
        return regex.test(test);
    }
    
    return false;
}


exports.evaluateStateResponses = async (state, replyToken, config, lastInput) => {
    let messages = [];

    switch (state.service_state_type) {
        case 'INPUT_FREETEXT':
            messages.push({
                type: 'text', 
                text: state.service_state_message
            });
            break;
        case 'INPUT_WITHOPTIONS':
            let options = state.service_state_input_options.split(';');
            let quickReplyItems = options.map(option => ({
                type: "action",
                action: {
                    type: "message",
                    label: option,
                    text: option
                }
            }));
            
            messages.push({
                type: 'text', 
                text: state.service_state_message,
                quickReply: {
                    "items": quickReplyItems
                }
            });
            break;
        case 'OUTPUT_TEXT':
        case 'OUTPUT_DATA':
            messages.push({
                type: 'text', 
                text: this.formatData(state.service_state_message, state.service_state_data_format)
            });
            break;
        default:
            throw new Error('Unknown state type');
    }

    sql = 'SELECT * FROM service_responses WHERE service_response_state_id = ?';
    const responses = await query(sql, [state.service_state_id]);

    let response = {
        status: 'NOT_EXECUTED',
        responseType: '-',
        responseValue: '-',
        messages: messages,
        condition: null,
        evaluatedState: state
    };

    for (let res of responses) {
        //Fetch condition details
        sql = 'SELECT * FROM service_conditions WHERE service_condition_id = ?';
        const condition = await query(sql, [res.service_response_condition_id]);

        if (condition.length === 0) {
            throw new Error('Condition not found');
        }
        
        let conditionResult = await this.evaluateCondition(condition[0], lastInput);

        response = {
            status: 'NOT_EXECUTED',
            responseType: res.service_response_type,
            responseValue: res.service_response_value,
            messages: messages,
            condition: condition,
            evaluatedState: state
        };
        //Compare condition result with response condition value
        console.log('Condition Result: ' + conditionResult + ' | Response Req Condition: ' + res.service_response_condition_value);

        if (conditionResult.toString() == res.service_response_condition_value) {
            //Execute the response
            console.log('Executed');
            response.status = 'EXECUTED';

            break;
        }
    }

    return response;
}

exports.getService = async (id) => {

    let sql = 'SELECT * FROM services WHERE service_id = ? AND is_enabled = 1';
    let services = await query(sql, [id]);

    if (services.length === 0) {
        throw new Error('Service not found or is disabled');
    }
    let service = services[0];

    return service;
};

