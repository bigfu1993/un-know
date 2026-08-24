/** 独立聊天模块属性，暂不绑定现有消息入口，由后续页面按需接入。 */
export interface ChatModuleProps {
  activeConversationId?: string | null;
  conversations?: ChatConversation[];
  messages?: ChatMessage[];
  orderCards?: ClientOrder[];
  quickActions?: ChatQuickAction[];
  sending?: boolean;
  onCreateQuickAction?: (label: string, content: string) => void;
  onSelectConversation: (conversation: ChatConversation) => void;
  onSendMessage: (content: string) => void;
  onSendOrderCard?: (order: ClientOrder) => void;
}

/** 聊天模块默认空会话，避免默认数组在渲染时重复创建。 */
const emptyConversations: ChatConversation[] = [];

/** 聊天模块默认空消息列表，供未接入消息接口的页面复用。 */
const emptyMessages: ChatMessage[] = [];

/** 聊天模块默认空快捷按钮列表。 */
const emptyQuickActions: ChatQuickAction[] = [];

/** 聊天模块默认空订单卡列表。 */
const emptyOrderCards: ClientOrder[] = [];

/** 独立聊天模块，支持文字消息、订单卡片和自定义快捷按钮，不包含表情与语音。 */
export function ChatModule({
  activeConversationId = null,
  conversations = emptyConversations,
  messages = emptyMessages,
  orderCards = emptyOrderCards,
  quickActions = emptyQuickActions,
  sending = false,
  onCreateQuickAction,
  onSelectConversation,
  onSendMessage,
  onSendOrderCard
}: ChatModuleProps) {
  const [messageDraft, setMessageDraft] = useState("");
  const [quickLabelDraft, setQuickLabelDraft] = useState("");
  const [quickContentDraft, setQuickContentDraft] = useState("");
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;

  /** 发送普通文字消息。 */
  function handleSendMessage() {
    const content = messageDraft.trim();
    if (!content || sending) {
      return;
    }

    onSendMessage(content);
    setMessageDraft("");
  }

  /** 保存快捷按钮，便于高频沟通内容复用。 */
  function handleCreateQuickAction() {
    const label = quickLabelDraft.trim();
    const content = quickContentDraft.trim();
    if (!label || !content) {
      return;
    }

    onCreateQuickAction?.(label, content);
    setQuickLabelDraft("");
    setQuickContentDraft("");
  }

  return (
    <section className="chat-module grid gap-[10px]" aria-label="独立聊天模块">
      <div className="chat-layout grid gap-[10px]">
        <aside className="chat-conversation-list grid gap-[8px]">
          {conversations.map((conversation) => (
            <button
              className={`chat-conversation-card grid gap-[4px] p-[10px] text-left ${conversation.id === activeConversation?.id ? "active" : ""}`}
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              type="button"
            >
              <span className="flex items-center justify-between gap-[8px]">
                <strong>{conversation.peer.nickname}</strong>
                {conversation.unreadCount > 0 ? <em>{conversation.unreadCount}</em> : null}
              </span>
              <span>{conversation.title}</span>
              <small>{conversation.lastMessage || "暂无消息"}</small>
            </button>
          ))}
          {conversations.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无会话</strong>
              <span>创建会话后可在这里查看沟通记录。</span>
            </article>
          ) : null}
        </aside>

        <main className="chat-window grid gap-[10px]">
          <header className="flow-card compact p-[12px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <MessageCircle size={18} />
              <div className="chat-window-title-copy">
                <strong>{activeConversation?.title ?? "聊天窗口"}</strong>
                <span>{activeConversation?.peer.nickname ?? "请选择会话"}</span>
              </div>
            </div>
          </header>

          <div className="chat-message-list grid gap-[8px]">
            {messages.map((message) => (
              <article className={`chat-message ${message.mine ? "mine" : "peer"} grid gap-[4px] p-[10px]`} key={message.id}>
                <span>
                  {message.sender.nickname} · {message.createdAt}
                </span>
                <strong>{message.content}</strong>
                {message.relatedCardType ? <small>{message.relatedCardType} · {message.relatedCardId}</small> : null}
              </article>
            ))}
            {messages.length === 0 ? (
              <article className="empty-state p-[14px] text-center">
                <strong>还没有消息</strong>
                <span>可以发送文字或订单卡片开始沟通。</span>
              </article>
            ) : null}
          </div>

          <div className="chat-shortcuts grid gap-[8px]">
            <div className="quick-entry-grid grid gap-[8px]">
              {quickActions.map((action) => (
                <button
                  className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
                  key={action.id}
                  onClick={() => setMessageDraft(action.content)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {orderCards.length > 0 ? (
              <div className="chat-order-cards grid gap-[8px]">
                {orderCards.map((order) => (
                  <button
                    className="flow-card compact grid gap-[5px] p-[10px] text-left"
                    key={order.id}
                    onClick={() => onSendOrderCard?.(order)}
                    type="button"
                  >
                    <strong>{order.title}</strong>
                    <span>
                      {order.status} · {order.amountLabel ?? formatCurrency(order.amount)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <footer className="chat-composer grid gap-[8px]">
            <textarea
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="输入消息"
              rows={3}
              value={messageDraft}
            />
            <button
              className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
              disabled={!messageDraft.trim() || sending}
              onClick={handleSendMessage}
              type="button"
            >
              发送
            </button>
          </footer>

          {onCreateQuickAction ? (
            <section className="chat-quick-editor grid gap-[8px]">
              <input
                onChange={(event) => setQuickLabelDraft(event.target.value)}
                placeholder="快捷按钮名称"
                value={quickLabelDraft}
              />
              <input
                onChange={(event) => setQuickContentDraft(event.target.value)}
                placeholder="快捷按钮内容"
                value={quickContentDraft}
              />
              <button className="ghost-button" onClick={handleCreateQuickAction} type="button">
                保存快捷按钮
              </button>
            </section>
          ) : null}
        </main>
      </div>
    </section>
  );
}
