# Instant Logout

Logout the game without having to wait 10 seconds.

## Commands

Instead of `instantlogout` you can also write `il`.

Command                                | Description                                                                                                                                                                                                | Alternativ Commands
-------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------
instantlogout **config**               | Displays current settings
instantlogout **messagedelay** `delay` | Sets the delay time for displaying messages to the given `delay` in milliseconds. The message delay time delays the start of displaying messages after pressing the logout button. _(Default delay: 4000)_ | **md**, **message delay**
instantlogout **logindelay** `delay`   | Sets the delay time for login to the given `delay` in milliseconds. The login delay time delays the login into the game after receiving logout event. _(Default delay: 1500)_                              | **ld**, **login delay**
