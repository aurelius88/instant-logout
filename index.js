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

function waitingTime(timeStamp) {
    let waitTime = timeStamp - Date.now();
    return waitTime > 0 ? waitTime : 0;
}

function adjustDelay(delay, timeStamp, tolerance) {
    if(tolerance < 0 || tolerance > 900)
        throw new RangeError(`tolerance should be between 0 and 900(ms), but was ${tolerance}.`);
    if(delay < 0) throw new RangeError(`delay should not be negative, but was ${delay}.`);
    if(timeStamp < 0) throw new RangeError(`timeStamp should not be negative, but was ${timeStamp}`);
    let wait = waitingTime(timeStamp);
    let timeAdjustment = Math.round((wait / 1000 - Math.floor((wait - tolerance) / 1000)) * 1000) - tolerance;
    console.log(`timestamp: ${timeStamp}, wait: ${wait}, timeAdjustment: ${timeAdjustment}`);
    return (wait > delay ? delay : 0) + timeAdjustment;
}

const LOGIN_MSG = "Login";
const LOGOUT_MSG = "Logout";

class InstantLogout {
    constructor(mod) {
        this.loginDelay = parseInt(mod.settings.loginDelay);
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
            this.startMessageInterval(LOGOUT_MSG, 1000, this.logoutTimeStamp, MESSAGE_TYPES.DEFAULT, 4000);
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
            if (!this.allowLogin && !this._getInterval(LOGIN_MSG + this.loginTimeStamp)) {
                this.stopMessageInterval(LOGOUT_MSG + this.logoutTimeStamp);
                this.startMessageInterval(LOGIN_MSG, 1000, this.loginTimeStamp);
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
        if(delayNumber < 0 || delayNumber > MAX_DELAY)
            throw new RangeError(`Delay should be between 0ms and ${MAX_DELAY}ms, but was ${delay}ms.`);
        this.mod.settings.loginDelay = delayNumber;
        this.mod.saveSettings();
        this.loginDelay = delayNumber;
    }

    login(data) {
        this.mod.send("C_SELECT_USER", 1, data);
    }

    get loginTimeStamp() {
        return this.logoutTimeStamp + this.loginDelay;
    }

    startMessageInterval(msg, interval, timeStamp, type=MESSAGE_TYPES.SHINY, delay = 0) {
        let delayTillRoundTime = adjustDelay(delay, timeStamp, 50);
        setTimeout(
            this.waitingTimeInterval.bind(this),
            delayTillRoundTime,
            msg,
            interval,
            timeStamp,
            type
        );
    }

    stopMessageInterval(uniqueName) {
        clearInterval(this._getInterval(uniqueName));
        this._removeInterval(uniqueName);
    }

    waitingTimeInterval(msg, interval, timeStamp, type=MESSAGE_TYPES.SHINY) {
        let seconds = Math.round(waitingTime(timeStamp)/1000);
        this.sendMessage(`${msg} in ${seconds} second${seconds>1?'s':''}`, type);
        this._addInterval(msg+timeStamp, setInterval(
            this.sendWaitingTimeMessage.bind(this),
            interval,
            msg,
            timeStamp,
            type));
    }

    sendWaitingTimeMessage(msg, timeStamp, type) {
        let seconds = Math.round(waitingTime(timeStamp)/1000);
        let finalMsg = `${seconds}`;
        if (seconds < 1) {
            clearInterval(this._getInterval(msg+timeStamp));
            this._removeInterval(msg+timeStamp);
            finalMsg = `${msg}!`;
        }
        this.sendMessage(finalMsg, type);
    }

    sendMessage(msg, type=MESSAGE_TYPES.SHINY) {
        this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
            type: type, // 42 Blue Shiny Text, 31 Normal Text
            chat: 0,
            channel: 27,
            message: msg
        });
    }

    _addInterval(uniqueName, intervalId) {
        let tmpInterval = this.timeToIntervals.get(uniqueName);
        if(tmpInterval != undefined) clearInterval(tmpInterval);
        this.timeToIntervals.set(uniqueName, intervalId);
    }

    _getInterval(uniqueName) {
        return this.timeToIntervals.get(uniqueName);
    }

    _removeInterval(uniqueName) {
        return this.timeToIntervals.delete(uniqueName);
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
