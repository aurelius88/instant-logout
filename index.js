/** Delay time in ms to smooth login process */
const LOGIN_DELAY = 1500;

class InstantLogout {
    constructor(mod) {
        this.mod = mod;
        this.reset();

        mod.hook("S_PREPARE_RETURN_TO_LOBBY", 1, e => {
            this.waitingTimeStamp = Date.now() + e.time * 1000 + LOGIN_DELAY;
            this.allowLogin = false;
            // instantly start logout
            mod.toClient("S_RETURN_TO_LOBBY", 1, {});
            this.returnHook = mod.hook("S_RETURN_TO_LOBBY", 1, () => {
                // mod.log( "GET S_RETURN_TO_LOBBY - Login now allowed" );
                if (!this.allowLogin && !this.loginTimeout) {
                    this.allowLogin = true;
                    if (this.userPacket) this.loginTimeout = setTimeout(this.login.bind(this), LOGIN_DELAY);
                }
                mod.unhook(this.returnHook);
            });
        });

        mod.hook("S_LOGIN", "*", () => {
            this.reset();
        });

        mod.hook("C_SELECT_USER", 1, e => {
            // don't allow login until "S_RETURN_TO_LOBBY" is received
            if (!this.allowLogin && !this.interval) {
                let msg = `Login in ${this.waitingTime} seconds.`;
                this.sendMessage(msg);
                this.interval = setInterval(this.sendWaitingTimeMessage.bind(this), 1000);
                this.userPacket = e;
            }
            return this.allowLogin;
        });
    }

    login() {
        this.mod.send("C_SELECT_USER", 1, this.userPacket);
    }

    get waitingTime() {
        return Math.floor((this.waitingTimeStamp - Date.now()) / 1000);
    }

    sendWaitingTimeMessage() {
        let w = this.waitingTime;
        let msg = `Login in ${w} seconds.`;
        if (w < 1) {
            clearInterval(this.interval);
            this.interval = null;
            msg = `Login!`;
        }
        this.sendMessage(msg);
    }

    sendMessage(msg) {
        //this.mod.log( msg );
        //SMT_LOBBY_CANNOT_CONNECT  SMT_MEGAPHONE_POPUP_MESSAGE
        //
        // let sysmsg = this.mod.buildSystemMessage( "SMT_LOBBY_WORLD_ENTER_FAILURE", {});
        // this.mod.send( "S_SYSTEM_MESSAGE", 1, {
        //     message: sysmsg
        // });
        this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
            type: 42, // 42 Blue Shiny Text, 31 Normal Text
            chat: 0,
            channel: 27,
            message: msg
        });
    }

    reset() {
        if (this.interval) clearInterval(this.interval);
        if (this.loginTimeout) clearInterval(this.loginTimeout);
        this.interval = null;
        this.loginTimeout = null;
        this.waitingTimeStamp = 0;
        this.allowLogin = true;
        this.userPacket = null;
    }

    destructor() {
        this.reset();
    }
}

module.exports = InstantLogout;
