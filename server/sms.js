const API = "https://app.text.lk/api/v3/sms/send";

// Booking message formatted for the USER (passenger)
export function bookingMsg(b) {
  const driverInfo = b.driverName ? `, Driver ${b.driverName}${b.driverPhone ? ` (${b.driverPhone})` : ''}` : '';
  return `Dear ${b.passenger}, your trip ${b.from} to ${b.to} on ${b.date} ${b.time} is allocated. Vehicle ${b.vehicleNo}${driverInfo}. -Sanken Admin`;
}

export function toLK(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("94")) return d;
  if (d.startsWith("0")) return "94" + d.slice(1);
  if (d.length === 9) return "94" + d;
  return null; // bad number
}

export async function sendSms(phone, text, customSenderId, customApiKey) {
  const apiKey = customApiKey || process.env.TEXTLK_API_KEY || "6538|xckoN5DsrWIXkJZTDuN3Vdk6LDQgz3dBRbXBccXVda89337a";
  const senderId = customSenderId || process.env.TEXTLK_SENDER_ID || "NotifyDEMO";

  if (!apiKey) throw new Error("Text.lk API token is missing.");

  const recipient = toLK(phone);
  if (!recipient) throw new Error("Invalid mobile number: " + phone);

  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: "plain",
      message: text
    })
  });

  const data = await res.json();
  if (data.status !== "success" && !data.ok) {
    const rawError = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : "SMS failed");
    if (rawError.includes("not authorized") || rawError.includes("Sender ID")) {
      throw new Error(`Sender ID "${senderId}" is not authorized on your Text.lk account. Please enter your registered Sender Name in Admin Settings.`);
    }
    throw new Error(rawError);
  }
  return data.data || data; // uid, status, cost, sms_count
}
