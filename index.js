/** All message types but CENTER_FOREVER_BLINKING_BLUE disappear after a short or less short duration */
const MESSAGE_TYPES = Object.freeze({
    // no stack for same
    TOP_SHINY_CYAN: 42, // 31,32,37,41,42,50,52,54-62,75,80,100
    TOP_SHINY_BLUE: 43, // 43,66,68,70,72,76,101
    TOP_SHINY_RED: 44,  // 44,53,67,69,71,73,77,102
    // slow stack for same
    TOP_DEFAULT_WHITE: 1,   // 0,9,14,15,19,21,40,45
    TOP_DEFAULT_YELLOW: 2,
    TOP_DEFAULT_RED: 3,     // 10,20,23
    // fast stack for same
    BOTTOM_DEFAULT_GREEN: 38,   // 22
    BOTTOM_DEFAULT_RED: 39,
    BOTTOM_BIG_CYAN: 33, 
    BOTTOM_BIG_GREEN: 46, 
    BOTTOM_BIG_WHITE: 48, 
    BOTTOM_BIG_YELLOW: 51,
    // special 
    BOTTOM_LEVEL_UP: 35,
    LEFT_INFO_BOX: 49,  // 81
    TOP_ACHIEVEMENT: 63, // 64,65,74
    // DOES NOT DISAPPEAR
    CENTER_FOREVER_BLINKING_LIGHTBLUE: 34, // 82
    // display duration restartable with same text
    TOP_BIG_WITH_BG: 103,
});

const STYLES = Object.freeze([
    MESSAGE_TYPES.TOP_SHINY_BLUE,
    MESSAGE_TYPES.TOP_SHINY_CYAN,
    MESSAGE_TYPES.TOP_SHINY_RED,
    MESSAGE_TYPES.TOP_DEFAULT_WHITE,
    MESSAGE_TYPES.TOP_DEFAULT_YELLOW,
    MESSAGE_TYPES.TOP_DEFAULT_RED,
    MESSAGE_TYPES.BOTTOM_DEFAULT_GREEN,
    MESSAGE_TYPES.BOTTOM_DEFAULT_RED,
    MESSAGE_TYPES.BOTTOM_BIG_WHITE,
    MESSAGE_TYPES.BOTTOM_BIG_GREEN,
    MESSAGE_TYPES.BOTTOM_BIG_CYAN,
    MESSAGE_TYPES.BOTTOM_BIG_GREEN,
    MESSAGE_TYPES.TOP_BIG_WITH_BG,
]);
const MAX_STYLE_ID = STYLES.length - 1;

const STYLE_NAMES = Object.freeze([
    "White text at top with shiny blue background (default)",
    "White text at top with shiny cyan background",
    "White text at top with shiny red background",
    "White text at top",
    "Yellow text at top",
    "Red text at top",
    "Green text at bottom",
    "Red text at bottom",
    "Big white text at bottom",
    "Big green text at bottom",
    "Big cyan text at bottom",
    "Big yellow text at bottom",
    "Big yellow text on half-transparent black background"
]);

const CHANNEL = Object.freeze({
    SAY: 0, PARTY: 1, GUILD: 2, AREA: 3, TRADE: 4, GREET: 9, 
    PRIVATE_1: 11, PRIVATE_2: 12, PRIVATE_3: 13, PRIVATE_4: 14, 
    PRIAVTE_5: 15, PRIAVTE_6: 16, PRIAVTE_7: 17, PRIAVTE_8: 18,
    PARTY_NOTICE: 21, EMOTE: 26, GLOBAL: 27, RAID_NOTIVE: 25, 
    RAID: 32, MEGAPHONE: 213, GUILD_AD: 214
});

const ROOT_COMMANDS = ['instantlogout','instant-logout','il'];
const MAX_DELAY = 10000; // in ms
const INTERVAL_TIME = 1000; // in ms
const LOGIN_MSG = "Login";
const LOGOUT_MSG = "Logout";

const HELP = {
    "config": {
        msg: `shows the current configuration`
    },
    "login-delay": {
        args: ["delay"],
        alts: ["logindelay", "login delay", "ld"],
        msg: `set the delay (in ms) before login is initiated`,
    },
    "message-delay": {
        args: ["delay"],
        alts: ["messagedelay", "message delay", "md"],
        msg: `set the delay (in ms) before messages are displayed`,
    },
    "message-style": {
        args: ["style"],
        alts: ["messagestyle", "message style", "ms"],
        msg: `set the style of the message using one of the styles below`,
        "styles": STYLE_NAMES
    }
}

const COLOR_ERROR = '#dd0000';
const COLOR_COMMAND = '#08ffda';
const COLOR_SUB_COMMAND = '#ff7a00';
const COLOR_VALUE = '#59f051';
const COLOR_ENABLE = '#56B4E9';
const COLOR_DISABLE = '#e64500';
const COLOR_HIGHLIGHT = '#81ee7b';

function c(msg, color) {
    return `<font color="${color}">${msg}</font>`;
}

function printHelpText() {
    this.mod.command.message(`USAGE: ${c('instant-logout', COLOR_COMMAND)} &lt;sub-command&gt;`);
    this.mod.command.message(`sub commands:`)
    printChildren.bind(this)(HELP, 0);
}

function printChildren(root, level) {
    for(command in root) {
        let value = root[command];
        if(typeof value === 'object' && !Array.isArray(value)) {
            let args = value.args ? value.args : [];
            let alts = value.alts ? value.alts : [];
            let msg = value.msg ? value.msg : '';
            this.mod.command.message(`${indent(level)}${c(command, COLOR_SUB_COMMAND)} ${
                c(args.join(' '), COLOR_HIGHLIGHT)}: ${msg ? msg : ''}`);
            if(alts.length > 0)
                this.mod.command.message(`${indent(level)}  -> alternative command notations: ${c(alts.join(', '))}`);
            for(child in value) {
                if(['args','alts','msg'].includes(child))
                    continue;
                this.mod.command.message(indent(level) + child)
                printChildren.bind(this)(value[child], level + 1);
            }
        } else if (typeof value === 'string') {
            this.mod.command.message(`${indent(level)}${c(command, COLOR_VALUE)}: ${value}`);
        }
        // ignore other types
    }
}

function indent(level) {
    let buf = [];
    for(let i = 0; i < level; i++)
        buf.push('  ');
    return buf.join('');
}

// function joinArgs(args) {
//     if(!Array.isArray(args) || args.length < 1) 
//         return "";
//     return args.slice(0,1)[0].name + args.slice(1).reduce((a,c) => a+' '+c.name,'')
// }

function unknown(command) {
    if(command)
        this.mod.command.message(`Unknown command '${command}'.`);
    printHelpText.bind(this)();
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

class InstantLogout {
    constructor(mod) {
        this.loginDelay = parseInt(mod.settings.loginDelay);
        this.messageDelay = parseInt(mod.settings.messageDelay);
        this.messageStyleIndex = parseInt(mod.settings.messageStyleIndex);
        this.mod = mod;
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
                "style": this.trySetMessageStyle,
                "$default": unknown
            },
            "md": this.trySetMessageDelay,
            "message-style": this.trySetMessageStyle,
            "messagestyle": this.trySetMessageStyle,
            "ms": this.trySetMessageStyle,
            "$default": unknown
        };

        mod.command.add(ROOT_COMMANDS, this.commands, this);

        mod.hook("S_PREPARE_RETURN_TO_LOBBY", 1, e => {
            this.logoutTimeStamp = Date.now() + e.time * 1000;
            this.allowLogin = false;
            this.msg = LOGOUT_MSG;
            this.startMessageInterval(INTERVAL_TIME, MESSAGE_TYPES.DEFAULT, this.messageDelay);
            // instantly start logout
            mod.toClient("S_RETURN_TO_LOBBY", 1, {});
            this.returnHook = mod.hook("S_RETURN_TO_LOBBY", 'event',
                { order: 0, filter: { fake: false, modified: null, silenced: null } }, () => {
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
            if (!this.allowLogin) {
                if(!this.userPacket) {
                    let seconds = Math.ceil(waitingTime(this.loginTimeStamp)/1000);
                    this.msg = LOGIN_MSG;
                    if(seconds > 0) {
                        if(!this.interval) {
                            this.startMessageInterval(INTERVAL_TIME);
                        } else {
                            this.sendMessage(`${this.msg} in ${seconds} second${seconds != 1?'s':''}`);
                        }
                    } else { this.sendMessage(`${this.msg}!`); }
                    this.userPacket = e;
                }
                return false;
            }
        });
    }

    showConfig() {
        this.mod.command.message(
            `Config:\nLogin delay: ${c(this.loginDelay, COLOR_VALUE)}ms\nMessage delay: ${
                c(this.messageDelay, COLOR_VALUE)}ms\nMessage style: ${
                    c(this.messageStyleIndex, COLOR_VALUE)} (${STYLE_NAMES[this.messageStyleIndex]})`);
        
    }

    trySetMessageStyle(style) {
        try {
            this.setMessageStyle(style);
            this.mod.command.message(`Set style to ${c(style, COLOR_VALUE)} (${STYLE_NAMES[style]}).`);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    tryCommand( command, message, ...args ) {
        try {
            command(...args);
            this.mod.command.message(message);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    trySetLoginDelay(delay) {
        try {
            this.setLoginDelay(delay);
            this.mod.command.message(`Set login delay to ${c(delay, COLOR_VALUE)}ms.`);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    trySetMessageDelay(delay) {
        try {
            this.setMessageDelay(delay);
            this.mod.command.message(`Set message delay to ${c(delay, COLOR_VALUE)}ms.`);
        } catch (err) {
            this.mod.command.message(err.message);
        }
    }

    setMessageStyle(style) {
        let styleNumber = parseInt(style);
        if(isNaN(style))
            throw new TypeError(c(`${c('style', COLOR_HIGHLIGHT)} 'should be a number.', COLOR_ERROR)`, COLOR_ERROR));
        if(styleNumber < 0 || styleNumber > MAX_STYLE_ID) {
            throw new RangeError(c(`${c('style', COLOR_HIGHLIGHT)} should be between ${c('0', COLOR_VALUE)
                } and ${c(MAX_STYLE_ID, COLOR_VALUE)}, but was ${c(style, COLOR_HIGHLIGHT)}.`, COLOR_ERROR));
        }
        this.mod.settings.messageStyleIndex = styleNumber;
        this.mod.saveSettings();
        this.messageStyleIndex = styleNumber;
    }

    setLoginDelay(delay) {
        let delayNumber = parseInt(delay);
        if(isNaN(delayNumber))
            throw new TypeError(c(`${c('delay', COLOR_HIGHLIGHT)} should be a number.`, COLOR_ERROR));
        if(delayNumber < 0 || delayNumber > MAX_DELAY)
            throw new RangeError(c(`${c('delay', COLOR_HIGHLIGHT)} should be between ${c('0', COLOR_VALUE)
                }ms and ${c(MAX_DELAY, COLOR_VALUE)}ms, but was ${c(delay, COLOR_HIGHLIGHT)}ms.`, COLOR_ERROR));
        this.mod.settings.loginDelay = delayNumber;
        this.mod.saveSettings();
        this.loginDelay = delayNumber;
    }

    setMessageDelay(delay) {
        let delayNumber = parseInt(delay);
        if(isNaN(delayNumber))
            throw new TypeError(c(`${c('delay', COLOR_HIGHLIGHT)} should be a number.`, COLOR_ERROR));
        if(delayNumber < 0 || delayNumber > MAX_DELAY)
            throw new RangeError(c(`${c('delay', COLOR_HIGHLIGHT)} should be between ${c('0', COLOR_VALUE)
        }ms and ${c(MAX_DELAY, COLOR_VALUE)}ms, but was ${delay}ms.`, COLOR_ERROR));
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

    startMessageInterval(interval, type=STYLES[this.messageStyleIndex], delay = 0) {
        let delayTillRoundTime = adjustDelay(delay, this.timeStamp, 50);
        setTimeout(
            this.waitingTimeInterval.bind(this),
            delayTillRoundTime,
            interval,
            type
        );
    }

    waitingTimeInterval(intervalTime, type=STYLES[this.messageStyleIndex]) {
        let seconds = Math.round(waitingTime(this.timeStamp)/1000);
        if(seconds > 0)
            this.sendMessage(`${this.msg} in ${seconds} second${seconds != 1?'s':''}`, type);
        this.interval = setInterval(
            this.sendWaitingTimeMessage.bind(this),
            intervalTime,
            type);
    }

    sendWaitingTimeMessage(type=STYLES[this.messageStyleIndex]) {
        let seconds = Math.round(waitingTime(this.timeStamp)/1000);
        if (seconds < 1) {
            this.sendMessage(`${this.msg}!`, type);
            clearInterval(this.interval);
            this.interval = null;
        } else this.sendMessage(`${seconds}`, type);
    }
    

    sendMessage(message, type=STYLES[this.messageStyleIndex], channel=CHANNEL.SAY) {
        this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
            type: type, 
            chat: false,
            channel: channel, 
            message: message
        });
    }

    reset() {
        if (this.loginTimeout) clearInterval(this.loginTimeout);
        if (this.interval) clearInterval(this.interval);
        this.loginTimeout = null;
        this.interval = null;
        this.logoutTimeStamp = 0;
        this.allowLogin = true;
        this.userPacket = null;
    }

    destructor() {
        this.reset();
    }
}

module.exports = InstantLogout;
