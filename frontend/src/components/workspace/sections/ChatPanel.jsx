export default function ChatPanel({
  t,
  chatRoomsPageData,
  activeRoomId,
  setActiveRoomId,
  renderListPagination,
  messagesPageData,
  user,
  activeRoom,
  chatInput,
  setChatInput,
  sendMessage,
  api,
  fetchCore,
}) {
  return (
    <article className="panel full">
      <h3>{t("Live Chat")}</h3>
      <div className="chat-layout">
        <div className="chat-rooms">
          {chatRoomsPageData.items.map((room) => (
            <button key={room.id} className={activeRoomId === room.id ? "active" : ""} onClick={() => setActiveRoomId(room.id)}>
              Booking #{room.booking_id}
            </button>
          ))}
          {renderListPagination("chatRooms", chatRoomsPageData)}
        </div>
        <div className="chat-messages">
          <div className="chat-scroll">
            {messagesPageData.items.map((m) => (
              <div key={m.id} className={m.sender === user.id ? "bubble mine" : "bubble"}>
                <small>{m.sender_name}</small>
                <p>{m.message}</p>
              </div>
            ))}
          </div>
          {renderListPagination("chatMessages", messagesPageData)}
          {activeRoom && activeRoom.contact_exchange_allowed && (
            <div className="contact-box">
              <strong>Contact exchange enabled</strong>
              <p>Seeker: {activeRoom.seeker_phone} | {activeRoom.seeker_email}</p>
              <p>Provider: {activeRoom.provider_phone} | {activeRoom.provider_email}</p>
            </div>
          )}
          <div className="chat-input-row">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={t("Type a message")} />
            <button onClick={sendMessage}>{t("Send")}</button>
            {activeRoom && !activeRoom.contact_exchange_allowed && (
              <button onClick={() => api.exchangeContacts(activeRoom.id).then(fetchCore)}>{t("Exchange Contacts")}</button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
