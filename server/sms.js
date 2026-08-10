const API = "https://app.text.lk/api/v3/sms/send";

// Booking message formatted for the USER (passenger)
export function bookingMsg(b) {
  const driverInfo = b.driverName ? `, Driver ${b.driverName}${b.driverPhone ? ` (${b.driverPhone})` : ''}` : '';
  return `Booking ${b.refNo}: Dear ${b.passenger}, your trip ${b.from} to ${b.to} on ${b.date} ${b.time} is allocated. Vehicle ${b.vehicleNo}${driverInfo}. -Sanken Admin`;
}

export function toLK(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("94")) return d;
  if (d.startsWith("0")) return "94" + d.slice(1);
  if (d.length === 9) return "94" + d;
  return null; // bad number
}

export async function sendSms(phone, text) {
  if (process.env.TEXTLK_ENABLED !== "true") return null;

  const recipient = toLK(phone);
  if (!recipient) throw new Error("Invalid number: " + phone);

  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TEXTLK_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      recipient,
      sender_id: process.env.TEXTLK_SENDER_ID,
      type: "plain",
      message: text
    })
  });

  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "SMS failed");
  return data.data; // uid, status, cost, sms_count
}
