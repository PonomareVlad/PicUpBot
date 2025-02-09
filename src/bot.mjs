import { Bot, InputFile, Keyboard, session } from 'grammy'
import { freeStorage } from '@grammyjs/storage-free'

export const {
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_SECRET_TOKEN: secretToken = String(token).split(':').pop(),
} = process.env

export const bot = new Bot(token)

const safe = bot.errorBoundary(console.error)

safe.use(
    session({
        initial: () => ({}),
        storage: freeStorage(token),
    })
)

const start = async ctx => {
    const { channel } = ctx.session
    if (channel) {
        await ctx.api.leaveChat(parseInt(channel))
        delete ctx.session.channel
    }
    await ctx.reply('В каком чате установить изображение ?', {
        reply_markup: new Keyboard().resized().requestChat('Выберите чат', 0, {
            user_administrator_rights: { can_change_info: true },
            bot_administrator_rights: { can_change_info: true },
            chat_is_channel: true,
        }),
    })
}

const chat = ctx => {
    const { session } = ctx
    session.channel ??= ctx.msg.chat_shared.chat_id
    return picture(ctx)
}

const picture = async ctx =>
    await ctx.reply('Отправьте изображение как документ')

const upload = async ctx => {
    try {
        const { channel } = ctx.session
        if (!channel) return start(ctx)
        const chat_id = parseInt(channel)
        const { file_path } = await ctx.getFile()
        const url = `https://api.telegram.org/file/bot${token}/${file_path}`
        await ctx.api.setChatPhoto(chat_id, new InputFile({ url }))
        await ctx.reply('Готово')
        await start(ctx)
    } catch (e) {
        await ctx.reply(e.message)
        await picture(ctx)
    }
}

safe.on(['msg:photo', 'msg:sticker', 'msg:animation'], picture)
safe.on('msg:chat_shared', chat)
safe.on('msg:document', upload)
safe.on('msg:text', start)
