/** Delay time in ms to smooth login process */
const MESSAGE_TYPES = Object.freeze({
    SHINY: 42, DEFAULT: 31
});
const ROOT_COMMAND = 'instantlogout';
const ROOT_COMMAND_ALT = 'il';
const MAX_DELAY = 10000; // in ms

function unknown(command) {
    this.mod.command.message(`Unknown sub command '${command != undefined ? command : ''}'.`
        +`\nUse login-delay <delay from 0ms to 10000ms> to set the delay before login is initiated.`
        +`\nAlternative sub commands: 'logindelay', 'login delay', 'ld`
        +`\nUse message-delay <delay from 0ms to 10000ms> to set the delay before messages are displayed.`
        +`\nAlternative sub commands: 'messagedelay', 'message delay', 'md`
        +`\nOr config to display the current configs`);
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
    return (wait > delay ? delay : 0) + timeAdjustment;
}

const LOGIN_MSG = "Login";
const LOGOUT_MSG = "Logout";

class InstantLogout {
    constructor(mod) {
        this.loginDelay = parseInt(mod.settings.loginDelay);
        this.messageDelay = parseInt(mod.settings.messageDelay);
        this.mod = mod;
        this.timeToIntervals = new Map();
        this.reset();

        this.commands = {
            "config": this.showConfig,
            "logindelay": this.trySetLoginDelay,
            "login-delay": this.trySetLoginDelay,
            "login": {
                "delay": this.trySetLoginDelay,
                "$default": unknown
            },
            "ld": this.trySetLoginDelay,
            "messagedelay": this.trySetMessageDelay,
            "message-delay": this.trySetMessageDelay,
            "message": {
                "delay": this.trySetMessageDelay,
                "$default": unknown
            },
            "md": this.trySetMessageDelay,
            "$default": unknown
        };

        mod.command.add(ROOT_COMMAND, this.commands, this);
        mod.command.add(ROOT_COMMAND_ALT, this.commands, this);

        mod.hook("S_PREPARE_RETURN_TO_LOBBY", 1, e => {
            this.logoutTimeStamp = Date.now() + e.time * 1000;
            this.allowLogin = false;
            this.msg = LOGOUT_MSG;
            // TODO delay -> configureable
            this.startMessageInterval(1000, MESSAGE_TYPES.DEFAULT, this.messageDelay);
            // instantly start logout
            mod.toClient("S_RETURN_TO_LOBBY", 1, {});
            this.returnHook = mod.hook("S_RETURN_TO_LOBBY", 'event', () => {
                this.allowLogin = true;
                if (!this.loginTimeout && this.userPacket) {
                    this.loginTimeout = setTimeout(this.login.bind(this), this.loginDelay, this.userPacket);
                }
                mod.unhook(this.returnHook);
                return false;
            });
        });

        // logged in to tera world
        mod.hook("S_LOGIN", "event", () => {
            this.reset();
        });

        // select character for login
        mod.hook("C_SELECT_USER", 1, e => {
            // don't allow login until "S_RETURN_TO_LOBBY" is received
            if (!this.allowLogin && !this.userPacket) {
                let seconds = Math.round(waitingTime(this.loginTimeStamp)/1000);
                this.msg = LOGIN_MSG;
                if(seconds > 0)
                    this.sendMessage(`${this.msg} in ${seconds} second${seconds != 1?'s':''}`);
                this.userPacket = e;
            }
            return this.allowLogin;
        });
    }

    showConfig() {
        this.mod.command.message(
            `Config:\nLogin delay: ${this.loginDelay}ms\nMessage delay: ${this.messageDelay}ms`);
    }

    trySetLoginDelay(delay) {
        try {
            this.setLoginDelay(delay);
            this.mod.command.message(`Set login delay to ${delay}ms.`);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    trySetMessageDelay(delay) {
        try {
            this.setMessageDelay(delay);
            this.mod.command.message(`Set message delay to ${delay}ms.`);
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

    setMessageDelay(delay) {
        let delayNumber = parseInt(delay);
        if(isNaN(delayNumber))
            throw new TypeError(`Delay should be a number.`);
        if(delayNumber < 0 || delayNumber > MAX_DELAY)
            throw new RangeError(`Delay should be between 0ms and ${MAX_DELAY}ms, but was ${delay}ms.`);
        this.mod.settings.messageDelay = delayNumber;
        this.mod.saveSettings();
        this.messageDelay = delayNumber;
    }

    login(data) {
        this.mod.send("C_SELECT_USER", 1, data);
    }

    get loginTimeStamp() {
        return this.logoutTimeStamp + this.loginDelay;
    }

    get timeStamp() {
        return this.userPacket ? this.loginTimeStamp : this.logoutTimeStamp;
    }

    startMessageInterval(interval, type=MESSAGE_TYPES.SHINY, delay = 0) {
        let delayTillRoundTime = adjustDelay(delay, this.timeStamp, 50);
        setTimeout(
            this.waitingTimeInterval.bind(this),
            delayTillRoundTime,
            interval,
            type
        );
    }

    waitingTimeInterval(intervalTime, type=MESSAGE_TYPES.SHINY) {
        let seconds = Math.round(waitingTime(this.timeStamp)/1000);
        if(seconds > 0)
            this.sendMessage(`${this.msg} in ${seconds} second${seconds != 1?'s':''}`, type);
        this.interval = setInterval(
            this.sendWaitingTimeMessage.bind(this),
            intervalTime,
            type);
    }

    sendWaitingTimeMessage(type) {
        let seconds = Math.round(waitingTime(this.timeStamp)/1000);
        if (seconds < 1) {
            this.sendMessage(`${this.msg}!`, type);
            clearInterval(this.interval);
        } else this.sendMessage(`${seconds}`, type);
    }

    sendMessage(msg, type=MESSAGE_TYPES.SHINY) {
        this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
            type: type, // 42 Blue Shiny Text, 31 Normal Text
            chat: 0,
            channel: 27,
            message: msg
        });
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
