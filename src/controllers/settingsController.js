const { appSetting } = require('../models');

const DEFAULT_SETTINGS = {
  business_name: 'Doctor Phone',
  business_phone: '+94 77 123 4567',
  business_email: 'info@doctorphone.lk',
  business_website: 'www.doctorphone.lk',
  business_address: '123 Main Street, Colombo 07, Sri Lanka',
  business_logo: null,
  currency: 'LKR - Sri Lankan Rupees',
  timezone: 'Asia/Colombo (GMT+5:30)',
  date_format: 'MMM DD, YYYY',
  language: 'English',
  invoice_prefix: 'INV-',
  next_invoice_no: 1,
  invoice_footer: 'Thank you for your business! Please contact us for any queries.',
};

function toResponseShape(record) {
  const s = record || DEFAULT_SETTINGS;
  return {
    businessName: s.business_name || DEFAULT_SETTINGS.business_name,
    businessPhone: s.business_phone || '',
    businessEmail: s.business_email || '',
    businessWebsite: s.business_website || '',
    businessAddress: s.business_address || '',
    businessLogo: s.business_logo || '',
    currency: s.currency || DEFAULT_SETTINGS.currency,
    timezone: s.timezone || DEFAULT_SETTINGS.timezone,
    dateFormat: s.date_format || DEFAULT_SETTINGS.date_format,
    language: s.language || DEFAULT_SETTINGS.language,
    invoicePrefix: s.invoice_prefix || DEFAULT_SETTINGS.invoice_prefix,
    nextInvoiceNo: Number(s.next_invoice_no || DEFAULT_SETTINGS.next_invoice_no),
    invoiceFooter: s.invoice_footer || DEFAULT_SETTINGS.invoice_footer,
  };
}

async function getOrCreateSingleton() {
  let settings = await appSetting.findOne({ where: { id: 1 } });
  if (!settings) {
    settings = await appSetting.create({ id: 1, ...DEFAULT_SETTINGS });
  }
  return settings;
}

exports.getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSingleton();
    res.json({ success: true, data: toResponseShape(settings) });
  } catch (error) {
    console.error('Failed to load app settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      business_name: (body.businessName || DEFAULT_SETTINGS.business_name).trim(),
      business_phone: (body.businessPhone || '').trim(),
      business_email: (body.businessEmail || '').trim(),
      business_website: (body.businessWebsite || '').trim(),
      business_address: (body.businessAddress || '').trim(),
      business_logo: body.businessLogo || null,
      currency: (body.currency || DEFAULT_SETTINGS.currency).trim(),
      timezone: (body.timezone || DEFAULT_SETTINGS.timezone).trim(),
      date_format: (body.dateFormat || DEFAULT_SETTINGS.date_format).trim(),
      language: (body.language || DEFAULT_SETTINGS.language).trim(),
      invoice_prefix: (body.invoicePrefix || DEFAULT_SETTINGS.invoice_prefix).trim() || 'INV-',
      next_invoice_no: Number.isFinite(Number(body.nextInvoiceNo)) ? Math.max(1, Number(body.nextInvoiceNo)) : DEFAULT_SETTINGS.next_invoice_no,
      invoice_footer: (body.invoiceFooter || DEFAULT_SETTINGS.invoice_footer).trim(),
    };

    let settings = await appSetting.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await appSetting.create({ id: 1, ...payload });
    } else {
      await settings.update(payload);
    }

    res.json({ success: true, message: 'Settings saved successfully.', data: toResponseShape(settings) });
  } catch (error) {
    console.error('Failed to save app settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
