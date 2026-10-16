/**
 * Options for every Socket.IO gateway in the app.
 *
 * All gateways on the HTTP port share ONE underlying Socket.IO server, and it
 * is configured by whichever gateway initialises first. If one gateway set a
 * larger message limit and another didn't, the limit in force would depend on
 * module order. That happened: the notifications gateway started first with
 * the 1 MB default, so any chat attachment over ~750 KB (base64 grows a file
 * by a third) silently dropped the connection. Every gateway spreads these.
 */
export const SOCKET_SERVER_OPTIONS = {
  cors: { origin: true, credentials: true },
  /* A 5 MB attachment is ~6.7 MB once base64-encoded inside its message. */
  maxHttpBufferSize: 8 * 1024 * 1024,
};
