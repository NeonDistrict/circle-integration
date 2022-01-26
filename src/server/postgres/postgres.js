const Pool = require('pg').Pool;
const fatal_error = require('../fatal_error.js');

module.exports = create_postgres = (config, cb) => {
    const pool = new Pool({
        user: config.postgres_user,
        host: config.postgres_host,
        database: config.postgres_database,
        password: config.postgres_password,
        port: config.postgres_port
    });
    
    pool.on('error', (error, client) => {
        return fatal_error({
            error: 'Postgres Error On Idle Client',
            details: error
        });
    });

    const query = (text, values, cb) => {
        // todo hook logs
        pool.query(text, values, (error, result) => {
            // todo hook logs
            return cb(error, result);
        });
    };

    const postgres = {
        pool: pool,
        query: query,
        create_all_tables:                  
            require('./create_all_tables.js')                 
                .bind(this, config, query),
        create_card_mark_completed:         
            require('./create_card_mark_completed.js')        
                .bind(this, config, query), 
        create_card_mark_failed_public_key: 
            require('./create_card_mark_failed_public_key.js')
                .bind(this, config, query), 
        create_card_mark_failed:            
            require('./create_card_mark_failed.js')           
                .bind(this, config, query), 
        create_card_mark_fraud:             
            require('./create_card_mark_fraud.js')            
                .bind(this, config, query), 
        create_card_mark_pending:           
            require('./create_card_mark_pending.js')          
                .bind(this, config, query), 
        create_card_start:                  
            require('./create_card_start.js')                 
                .bind(this, config, query), 
        create_purchase:                    
            require('./create_purchase.js')                   
                .bind(this, config, query),
        create_user:
            require('./create_user.js')
                .bind(this, config, query),
        delete_all_tables:                  
            require('./delete_all_tables.js')                 
                .bind(this, config, query),
        find_purchase_by_client_generated_idempotency_key: 
            require('./find_purchase_by_client_generated_idempotency_key.js')
                .bind(this, config, query),
        find_user_by_user_id:
            require('./find_user_by_user_id.js')
                .bind(this, config, query),
        payment_3ds_mark_completed:         
            require('./payment_3ds_mark_completed.js')        
                .bind(this, config, query),
        payment_3ds_mark_failed:            
            require('./payment_3ds_mark_failed.js')           
                .bind(this, config, query),
        payment_3ds_mark_fraud:             
            require('./payment_3ds_mark_fraud.js')            
                .bind(this, config, query),
        payment_3ds_mark_pending:           
            require('./payment_3ds_mark_pending.js')          
                .bind(this, config, query),
        payment_3ds_mark_redirected:        
            require('./payment_3ds_mark_redirected.js')       
                .bind(this, config, query),
        payment_3ds_mark_unavailable:       
            require('./payment_3ds_mark_unavailable.js')      
                .bind(this, config, query),
        payment_3ds_start:                  
            require('./payment_3ds_start.js')                 
                .bind(this, config, query),
        payment_cvv_mark_completed:         
            require('./payment_cvv_mark_completed.js')        
                .bind(this, config, query),
        payment_cvv_mark_failed:            
            require('./payment_cvv_mark_failed.js')           
                .bind(this, config, query),
        payment_cvv_mark_fraud:             
            require('./payment_cvv_mark_fraud.js')            
                .bind(this, config, query),
        payment_cvv_mark_pending:           
            require('./payment_cvv_mark_pending.js')          
                .bind(this, config, query),
        payment_cvv_mark_unavailable:       
            require('./payment_cvv_mark_unavailable.js')      
                .bind(this, config, query),
        payment_cvv_start:                  
            require('./payment_cvv_start.js')                 
                .bind(this, config, query),
        payment_unsecure_mark_completed:    
            require('./payment_unsecure_mark_completed.js')   
                .bind(this, config, query),
        payment_unsecure_mark_failed:       
            require('./payment_unsecure_mark_failed.js')      
                .bind(this, config, query),
        payment_unsecure_mark_fraud:        
            require('./payment_unsecure_mark_fraud.js')       
                .bind(this, config, query),
        payment_unsecure_mark_pending:      
            require('./payment_unsecure_mark_pending.js')     
                .bind(this, config, query),
        reset_all_tables:                   
            require('./reset_all_tables.js')                  
                .bind(this, config, query),
        user_mark_fraud:
            require('./user_mark_fraud.js')
                .bind(this, config, query),
        user_mark_t_modified:
            require('./user_mark_t_modified.js')
                .bind(this, config, query),
        shutdown: (cb) => {
            postgres.pool.end(cb);
        }
    };

    return cb(null, postgres);
};