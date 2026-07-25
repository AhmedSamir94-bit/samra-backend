export const whatsappStatusResponseExample = {
  enabled: true,
  provider: 'greenapi',
  ownerPhone: '+201555541096',
  connected: true,
};

export const whatsappQrResponseExample = {
  provider: 'wwebjs',
  needsQr: true,
  qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
};

export const whatsappTestResponseExample = {
  ok: true,
  message: 'Test WhatsApp message sent',
  provider: 'greenapi',
  to: '201555541096',
};
