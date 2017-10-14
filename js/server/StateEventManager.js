"use strict";

class StateEventManager {
    constructor() {
    	this.app_state = {};
    	this.event_store = [];
    }

    get_app_state(){
    	return this.app_state; 
    }

    wipe_app_state(){
    	this.app_state = {};
    }

    get_event_store(){
    	return this.event_store; 
    }

    append_event(event){
    	this.event_store.push(event);
    }

    process_events(){

    	/* we will wipe the entire state and recreate it. */
    	/* maybe replace this with a snapshot implementation in the future. */
    	this.wipe_app_state();

    	/* recreate state of app. */
    	for(var i = 0; i < this.event_store.length; i++){

    		/* verbose logs. */
    		console.log('Processing Event - ' + this.event_store[i].name);

    		this.event_store[i].process(this.app_state);
    	}
    }
}

module.exports = StateEventManager;