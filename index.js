class InstantLogout {
    constructor( mod ) {
        this.mod = mod;
        this.reset();

        mod.hook( "S_PREPARE_RETURN_TO_LOBBY", 1, e => {
            this.waitingTime = Date.now() + e.time * 1000;
            this.allowLogin = false;
            // instantly start logout
            mod.send( "S_RETURN_TO_LOBBY", 1, {});
            this.returnHook = mod.hook( "S_RETURN_TO_LOBBY", 1, () => {
                // mod.log( "GET S_RETURN_TO_LOBBY - Login now allowed" );
                if ( !this.allowLogin ) {
                    this.allowLogin = true;
                    if ( this.userPacket ) mod.send( "C_SELECT_USER", 1, this.userPacket );
                    this.reset();
                }
                mod.unhook( this.returnHook );
            });
        });

        mod.hook( "C_SELECT_USER", 1, e => {
            // mod.log( "GET C_SELECT_USER - Login is " + ( this.allowLogin ? "allowed" : "not allowed" ) );
            // don't allow login until "S_RETURN_TO_LOBBY" is received
            if ( !this.allowLogin && !this.interval ) {
                this.userPacket = e;
                // this.interval = setInterval( this.sendWaitingTimeMessage.bind( this ), 1000 );
            }
            return this.allowLogin;
        });
    }

    sendWaitingTimeMessage() {
        let w = Math.floor( ( this.waitingTime - Date.now() ) / 1000 );
        if ( w < 1 ) clearInterval( this.interval );
        let msg = `Login in ${w} seconds.`;
        this.mod.log( msg );
        //SMT_LOBBY_CANNOT_CONNECT  SMT_MEGAPHONE_POPUP_MESSAGE
        //
        // let sysmsg = this.mod.buildSystemMessage( "SMT_LOBBY_WORLD_ENTER_FAILURE", {});
        // this.mod.send( "S_SYSTEM_MESSAGE", 1, {
        //     message: sysmsg
        // });
    }

    reset() {
        if ( this.interval ) clearInterval( this.interval );
        this.waitingTime = 0;
        this.allowLogin = true;
        this.interval = null;
        this.userPacket = null;
    }

    destructor() {
        this.reset();
    }
}

module.exports = InstantLogout;
