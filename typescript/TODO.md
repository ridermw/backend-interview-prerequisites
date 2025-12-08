This is a quick timed test to add a chat feature to this base project.

1. create an api that will create a channel
2. Add/remove members
3. Post messages to a channel
4. List members and messages.

Non-functional

1. Enforce membership, security, Multi-Tenant.
2. Only members can post/read messsages in a channel
3. Treat 1:1 communication as a channel with 2 members. Talk about tradeoffs. Analytics where most usage is one or the other.
4. Messages stored chronological order. makes retrieval easier.
5. Users have roles per channel: Admin, Contributor, Reader
6. use websockets to push messages??
7. use docker to host server. use Insomnia for REST Client. Consider separate docker for WS client?

Out of scope:

1. Add/remove users
2. update status
3. reactions

Data Model

1. Users
   Id, name, handle, login, tenantId, status
2. Channels
   Id, names, isPrivate, tenantId, isDM
3. ChannelMembership
   ChannelId, MemberId, lastReadId, role
4. Messages
   Id, channelId, userId, body, createdDateTime

Seed DB with some test data, includes users, channels, memerships, and messages.

APIs

1. POST /api/admin/channels.add -> returns channelId
   { "name", isPrivate, isDM, adminId(default to user)}
   // create new channel and add adminId as member with admin priveleges.
2. POST /api/admin/channelMembership.add -> 200 success; 404 for channel or user if not found.
   { channelId, userId, role}
   // adds user to channel with role.
3. POST /api/admin/channelMembership.remove -> 200 success; 404 for channel or user if not found.
   { channelId, userId, role}
   // adds user to channel with role.
4. POST /api/channel/message.add -> 200 success; 500 error saving message.
   { channelId, userId, body}
   // posts a message to the channel.
5. GET /api/channeMembership.get -> list of members.
   // could be queryable to filter list?
6. GET /api/messages.getById(Id) -> return messages since Id.
7. GET /api/messages.getByDateTim(dateTime) -> return messages since dateTime.

NOTES

1. decided to remove roles from scope. when channel created, add the creator to the channel.
2. reactions are out of scope.
3. ignore DMs, stick with channels for now.
