/** Delay time in ms to smooth login process */
const MESSAGE_TYPES = Object.freeze({
    SHINY: 42, DEFAULT: 31
});
const ROOT_COMMAND = 'instantlogout';
const ROOT_COMMAND_ALT = 'il';
const MAX_DELAY = 10000; // in ms

function unknown(command) {
    this.mod.command.message(`Unknown command '${command != undefined ? command : ''}'.`
        +`\nUse loginDelay <delay from 0ms to 10000ms> to set the delay before login is started.\n`
        +`Alternative commands: 'logindelay', 'login-delay', 'login delay', 'ld'`);
}

class InstantLogout {
    constructor(mod) {
        this.loginDelay = mod.settings.loginDelay;
        this.mod = mod;
        this.timeToIntervals = new Map();
        this.reset();

        this.commands = {
            "logindelay": this.trySetLoginDelay,
            "loginDelay": this.trySetLoginDelay,
            "login-delay": this.trySetLoginDelay,
            "login": {
                "delay": this.trySetLoginDelay,
                "$default": unknown
            },
            "ld": this.trySetLoginDelay,
            "$default": unknown
        };

        mod.command.add(ROOT_COMMAND, this.commands, this);
        mod.command.add(ROOT_COMMAND_ALT, this.commands, this);

        mod.hook("S_PREPARE_RETURN_TO_LOBBY", 1, e => {
            this.logoutTimeStamp = Date.now() + e.time * 1000;
            this.allowLogin = false;
            this.startMessageInterval("Logout", 1000, this.logoutTimeStamp, MESSAGE_TYPES.DEFAULT, 4000);
            // instantly start logout
            mod.toClient("S_RETURN_TO_LOBBY", 1, {});
            this.returnHook = mod.hook("S_RETURN_TO_LOBBY", 1, () => {
                // mod.log( "GET S_RETURN_TO_LOBBY - Login now allowed" );
                if (!this.allowLogin && !this.loginTimeout) {
                    this.allowLogin = true;
                    if (this.userPacket)
                        this.loginTimeout = setTimeout(this.login.bind(this), this.loginDelay, this.userPacket);
                }
                mod.unhook(this.returnHook);
            });
        });

        mod.hook("S_LOGIN", "*", () => {
            this.reset();
        });

        mod.hook("C_SELECT_USER", 1, e => {
            // don't allow login until "S_RETURN_TO_LOBBY" is received
            if (!this.allowLogin && !this._getInterval(this.loginTimeStamp)) {
                this.stopMessageInterval(this.logoutTimeStamp);
                this.startMessageInterval("Login", 1000, this.loginTimeStamp);
                this.userPacket = e;
            }
            return this.allowLogin;
        });
    }

    trySetLoginDelay(delay) {
        try {
            this.setLoginDelay(delay);
            this.mod.command.message(`Set login delay to ${delay}ms.`);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    setLoginDelay(delay) {
        let delayNumber = parseInt(delay);
        if(isNaN(delayNumber))
            throw new TypeError(`Delay should be a number.`);
        if(delay < 0 || delay > MAX_DELAY)
            throw new RangeError(`Delay should be between 0ms and ${MAX_DELAY}ms, but was ${delay}ms.`);
        this.mod.settings.loginDelay = delay;
        this.mod.saveSettings();
    }

    login(data) {
        this.mod.send("C_SELECT_USER", 1, data);
    }

    waitingTime(timeStamp) {
        return (timeStamp - Date.now()) / 1000;
    }

    get loginTimeStamp() {
        return this.logoutTimeStamp + this.loginDelay;
    }

    startMessageInterval(msg, interval, timeStamp, type=MESSAGE_TYPES.SHINY, delay = 0) {
        let delayTillRoundTime = delay + this.waitingTime(timeStamp)
            - Math.floor(this.waitingTime(timeStamp));
        setTimeout(
            this.waitingTimeInterval.bind(this),
            delayTillRoundTime,
            msg,
            interval,
            timeStamp,
            type
        );
    }

    stopMessageInterval(timeStamp) {
        clearInterval(this._getInterval(timeStamp));
        this._removeInterval(timeStamp);
    }

    waitingTimeInterval(msg, interval, timeStamp, type=MESSAGE_TYPES.SHINY) {
        this.sendMessage(`${msg} in ${Math.round(this.waitingTime(timeStamp))} seconds.`);
        this._addInterval(timeStamp, setInterval(
            this.sendWaitingTimeMessage.bind(this),
            interval,
            msg,
            timeStamp,
            type));
    }

    sendWaitingTimeMessage(msg, timeStamp, type) {
        let currentTime = Math.round(this.waitingTime(timeStamp));
        let finalMsg = `${msg} in ${currentTime} seconds.`;
        if (currentTime < 1) {
            clearInterval(this._getInterval(timeStamp));
            this._removeInterval(timeStamp);
            finalMsg = `${msg}!`;
        }
        this.sendMessage(finalMsg, type);
    }

    sendMessage(msg, type) {
        this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
            type: type, // 42 Blue Shiny Text, 31 Normal Text
            chat: 0,
            channel: 27,
            message: msg
        });
    }

    _addInterval(timeStamp, interval) {
        let tmpInterval = this.timeToIntervals.get(timeStamp);
        if(tmpInterval != undefined) clearInterval(tmpInterval);
        this.timeToIntervals.set(timeStamp, interval);
    }

    _getInterval(timeStamp) {
        return this.timeToIntervals.get(timeStamp);
    }

    _removeInterval(timeStamp) {
        return this.timeToIntervals.delete(timeStamp);
    }

    reset() {
        if (this.loginTimeout) clearInterval(this.loginTimeout);
        for(let interval of this.timeToIntervals.values()) {
            clearInterval(interval);
        }
        this.timeToIntervals.clear();
        this.loginTimeout = null;
        this.logoutTimeStamp = 0;
        this.allowLogin = true;
        this.userPacket = null;
    }

    destructor() {
        this.reset();
    }
}

module.exports = InstantLogout;
