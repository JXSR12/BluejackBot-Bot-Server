const { query } = require('../database');

exports.handle = async (endpointId, data) => {
    if(endpointId == 'SAC001'){
        if(data.category_name){
            if(data.category_name === 'Fruits'){
                return {
                    items: [
                        {
                            name: 'Apple',
                            description: 'A fruit that grows on a tree.'
                        },
                        {
                            name: 'Grape',
                            description: 'A fruit that makes wine.'
                        },
                        {
                            name: 'Banana',
                            description: 'A fruit that is usually yellow.'
                        },
                        {
                            name: 'Watermelon',
                            description: 'A large watery fruit with green outer skin and red insides.'
                        }
                    ]
                };
            } else if(data.category_name === 'Vegetables'){
                const vegetablesResult = await query('SELECT vegetable_name, vegetable_desc FROM test_vegetables');
                
                const vegetables = vegetablesResult.map(veg => ({
                    name: veg.vegetable_name,
                    description: veg.vegetable_desc
                }));

                return { items: vegetables };
            }
        }
    }
};
