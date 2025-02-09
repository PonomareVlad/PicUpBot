import { Bot, InputFile, Keyboard } from 'grammy'
import { StatelessQuestion } from '@grammyjs/stateless-question'

export const {
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_SECRET_TOKEN: secretToken = String(token).split(':').pop(),
} = process.env

export const bot = new Bot(token)

const safe = bot.errorBoundary(console.error)

const start = ctx =>
    ctx.reply('В каком чате установить изображение ?', {
        reply_markup: new Keyboard().resized().requestChat('Выберите чат', 0, {
            user_administrator_rights: { can_change_info: true },
            bot_administrator_rights: { can_change_info: true },
        }),
    })

const picture = (ctx, chat_id = ctx.msg.chat_shared.chat_id.toString()) =>
    pictureQuestion.replyWithMarkdownV2(
        ctx,
        'Отправьте изображение как документ',
        chat_id
    )

const pictureQuestion = new StatelessQuestion(
    'picture',
    async (ctx, chat_id) => {
        if (!ctx.has('msg:document')) return picture(ctx, chat_id)
        try {
            const { file_path } = await ctx.getFile()
            const url = `https://api.telegram.org/file/bot${token}/${file_path}`
            await ctx.api.setChatPhoto(
                parseInt(chat_id),
                new InputFile({ url })
            )
            await ctx.api.leaveChat(parseInt(chat_id))
            await ctx.reply('Готово')
            await start(ctx)
        } catch (e) {
            await ctx.reply(e.message)
            await picture(ctx, chat_id)
        }
    }
)

safe.use(pictureQuestion.middleware())
safe.on('message:chat_shared', ctx => picture(ctx))
safe.on('message:text', start)
