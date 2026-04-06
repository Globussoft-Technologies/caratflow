// ─── E2E Test Data ─────────────────────────────────────────────
// Realistic test data for Indian jewelry business workflows.
// All money in paise (integer), all weights in milligrams (integer).

// ─── Metal Rates ───────────────────────────────────────────────
// Rates are per 10 grams in paise.

export const METAL_RATES = {
  GOLD_24K: {
    ratePer10gPaise: 6_200_000, // Rs 62,000 per 10g
    ratePerGramPaise: 620_000,  // Rs 6,200 per g
    purity: 999,
  },
  GOLD_22K: {
    ratePer10gPaise: 5_800_000, // Rs 58,000 per 10g
    ratePerGramPaise: 580_000,  // Rs 5,800 per g
    purity: 916,
  },
  GOLD_18K: {
    ratePer10gPaise: 4_750_000, // Rs 47,500 per 10g
    ratePerGramPaise: 475_000,  // Rs 4,750 per g
    purity: 750,
  },
  GOLD_14K: {
    ratePer10gPaise: 3_600_000, // Rs 36,000 per 10g
    ratePerGramPaise: 360_000,  // Rs 3,600 per g
    purity: 585,
  },
  SILVER: {
    ratePer10gPaise: 80_000,    // Rs 800 per 10g
    ratePerGramPaise: 8_000,    // Rs 80 per g
    purity: 999,
  },
  PLATINUM: {
    ratePer10gPaise: 3_100_000, // Rs 31,000 per 10g
    ratePerGramPaise: 310_000,  // Rs 3,100 per g
    purity: 950,
  },
} as const;

// Old gold buy rate (slightly lower than market)
export const OLD_GOLD_BUY_RATE = {
  GOLD_22K: {
    ratePer10gPaise: 5_700_000, // Rs 57,000 per 10g
    ratePerGramPaise: 570_000,  // Rs 5,700 per g
  },
} as const;

// ─── GST Rates ─────────────────────────────────────────────────

export const GST_RATES = {
  JEWELRY: 300,         // 3% (stored as x100)
  MAKING_CHARGES: 500,  // 5%
  DIAMONDS: 300,        // 3%
  SILVER: 300,          // 3%
} as const;

// ─── Jewelry Products ──────────────────────────────────────────

export const PRODUCTS = {
  GOLD_NECKLACE_22K_15G: {
    name: '22K Gold Necklace Traditional Design',
    sku: 'GN-22K-15G-001',
    productType: 'GOLD_JEWELRY',
    metalType: 'GOLD',
    metalPurity: 916,
    grossWeightMg: 15_000,         // 15 grams
    netWeightMg: 15_000,
    metalWeightMg: 15_000,
    makingChargePerGramPaise: 50_000, // Rs 500/g
    totalMakingChargesPaise: 750_000,  // Rs 7,500 total
    wastagePercent: 200,           // 2%
    hsnCode: '7113',
    huidNumber: 'HUID123456',
    // Metal value: 5800 * 15 = Rs 87,000 = 8_700_000 paise
    metalValuePaise: 8_700_000,
    // Subtotal: metal + making = 87000 + 7500 = Rs 94,500 = 9_450_000 paise
    subtotalPaise: 9_450_000,
    // GST 3% on subtotal: Rs 2,835 = 283_500 paise
    gstPaise: 283_500,
    // Total: Rs 97,335 = 9_733_500 paise
    totalPaise: 9_733_500,
  },

  GOLD_RING_22K_5G: {
    name: '22K Gold Ring Solitaire',
    sku: 'GR-22K-5G-001',
    productType: 'GOLD_JEWELRY',
    metalType: 'GOLD',
    metalPurity: 916,
    grossWeightMg: 5_000,          // 5 grams
    netWeightMg: 5_000,
    metalWeightMg: 5_000,
    makingChargePerGramPaise: 60_000, // Rs 600/g
    totalMakingChargesPaise: 300_000,  // Rs 3,000
    wastagePercent: 200,
    hsnCode: '7113',
    huidNumber: 'HUID789012',
    metalValuePaise: 2_900_000,    // 5800 * 5 = Rs 29,000
    subtotalPaise: 3_200_000,      // Rs 32,000
    gstPaise: 96_000,              // Rs 960
    totalPaise: 3_296_000,         // Rs 32,960
  },

  GOLD_BANGLE_22K_20G: {
    name: '22K Gold Bangle Pair',
    sku: 'GB-22K-20G-001',
    productType: 'GOLD_JEWELRY',
    metalType: 'GOLD',
    metalPurity: 916,
    grossWeightMg: 20_000,         // 20 grams
    netWeightMg: 20_000,
    metalWeightMg: 20_000,
    makingChargePerGramPaise: 40_000, // Rs 400/g
    totalMakingChargesPaise: 800_000,  // Rs 8,000
    wastagePercent: 150,
    hsnCode: '7113',
    huidNumber: 'HUID345678',
    metalValuePaise: 11_600_000,   // 5800 * 20 = Rs 1,16,000
    subtotalPaise: 12_400_000,     // Rs 1,24,000
    gstPaise: 372_000,             // Rs 3,720
    totalPaise: 12_772_000,        // Rs 1,27,720
  },

  DIAMOND_PENDANT_18K: {
    name: '18K Gold Diamond Pendant 0.5ct',
    sku: 'DP-18K-3G-001',
    productType: 'DIAMOND_JEWELRY',
    metalType: 'GOLD',
    metalPurity: 750,
    grossWeightMg: 3_500,          // 3.5 grams total
    netWeightMg: 3_000,            // 3g gold
    metalWeightMg: 3_000,
    stoneWeightMg: 100,            // 0.5ct = 100mg
    makingChargePerGramPaise: 80_000, // Rs 800/g
    totalMakingChargesPaise: 240_000,  // Rs 2,400
    wastagePercent: 150,
    hsnCode: '7113',
    metalValuePaise: 1_425_000,    // 4750 * 3 = Rs 14,250
    stoneValuePaise: 5_000_000,    // Rs 50,000
    subtotalPaise: 6_665_000,      // Rs 66,650
    gstPaise: 199_950,             // Rs 1,999.50
    totalPaise: 6_864_950,         // Rs 68,649.50
  },

  SILVER_ANKLET: {
    name: 'Silver Anklet 925 Pair',
    sku: 'SA-925-50G-001',
    productType: 'SILVER_JEWELRY',
    metalType: 'SILVER',
    metalPurity: 925,
    grossWeightMg: 50_000,         // 50 grams
    netWeightMg: 50_000,
    metalWeightMg: 50_000,
    makingChargePerGramPaise: 3_000, // Rs 30/g
    totalMakingChargesPaise: 150_000, // Rs 1,500
    wastagePercent: 300,
    hsnCode: '7113',
    metalValuePaise: 400_000,      // 80 * 50 = Rs 4,000
    subtotalPaise: 550_000,        // Rs 5,500
    gstPaise: 16_500,              // Rs 165
    totalPaise: 566_500,           // Rs 5,665
  },

  // Wedding set for manufacturing flow
  WEDDING_SET_22K: {
    name: '22K Gold Wedding Set (Necklace + Earrings + Ring)',
    sku: 'WS-22K-50G-001',
    productType: 'GOLD_JEWELRY',
    metalType: 'GOLD',
    metalPurity: 916,
    grossWeightMg: 50_000,         // 50 grams total
    netWeightMg: 48_000,           // 48g gold after finishing
    metalWeightMg: 50_000,         // 50g issued
    makingChargePerGramPaise: 60_000, // Rs 600/g
    totalMakingChargesPaise: 3_000_000, // Rs 30,000
    wastagePercent: 300,           // 3%
    hsnCode: '7113',
    metalValuePaise: 29_000_000,   // 5800 * 50 = Rs 2,90,000
    subtotalPaise: 32_000_000,     // Rs 3,20,000
    gstPaise: 960_000,             // Rs 9,600
    totalPaise: 32_960_000,        // Rs 3,29,600
  },
} as const;

// ─── Sample Customers ──────────────────────────────────────────

export const CUSTOMERS = {
  PRIYA_PATEL: {
    firstName: 'Priya',
    lastName: 'Patel',
    phone: '+919876543210',
    email: 'priya.patel@gmail.com',
    state: 'MH',
    city: 'Mumbai',
    pincode: '400001',
    addressLine1: '15, Zaveri Bazaar',
    pan: 'ABCPP1234Q',
  },
  AMIT_SHAH: {
    firstName: 'Amit',
    lastName: 'Shah',
    phone: '+919123456789',
    email: 'amit.shah@yahoo.com',
    state: 'GJ',
    city: 'Ahmedabad',
    pincode: '380001',
    addressLine1: '22, C.G. Road',
    pan: 'DEFAS5678R',
  },
  SUNITA_DEVI: {
    firstName: 'Sunita',
    lastName: 'Devi',
    phone: '+918765432109',
    email: 'sunita.devi@hotmail.com',
    state: 'RJ',
    city: 'Jaipur',
    pincode: '302001',
    addressLine1: '10, Johari Bazaar',
    pan: 'GHISD9012T',
  },
  // Export buyer
  JAMES_WILSON: {
    firstName: 'James',
    lastName: 'Wilson',
    phone: '+12025551234',
    email: 'james.wilson@gemimports.com',
    state: null,
    city: 'New York',
    country: 'US',
    pincode: '10001',
    addressLine1: '47th Street, Diamond District',
  },
} as const;

// ─── Sample Suppliers ──────────────────────────────────────────

export const SUPPLIERS = {
  RAJESH_GOLD_REFINERY: {
    name: 'Rajesh Gold Refinery',
    gstin: '27AAECR4567P1ZQ',
    state: 'MH',
    city: 'Mumbai',
    phone: '+912233445566',
    email: 'orders@rajeshgold.com',
    // Contracted rate for 22K gold per gram in paise
    contractedRatePerGramPaise: 575_000, // Rs 5,750/g
    contractedRatePer10gPaise: 5_750_000,
  },
  SURAT_DIAMOND_CO: {
    name: 'Surat Diamond Co.',
    gstin: '24AABCS1234Q1ZR',
    state: 'GJ',
    city: 'Surat',
    phone: '+912612345678',
    email: 'sales@suratdiamond.com',
  },
} as const;

// ─── Manufacturing Data ────────────────────────────────────────

export const MANUFACTURING = {
  WEDDING_SET_BOM: {
    name: 'Wedding Set BOM - 22K Gold + Diamonds',
    outputQuantity: 1,
    estimatedCostPaise: BigInt(35_000_000), // Rs 3,50,000
    estimatedTimeMins: 2880, // 48 hours
    items: [
      {
        itemType: 'RAW_MATERIAL',
        description: '22K Gold',
        quantityRequired: 1,
        unitOfMeasure: 'g',
        weightMg: BigInt(50_000), // 50 grams
        estimatedCostPaise: BigInt(29_000_000), // Rs 2,90,000
        wastagePercent: 300, // 3%
        sortOrder: 1,
      },
      {
        itemType: 'STONE',
        description: 'Round Brilliant Diamond 2ct total',
        quantityRequired: 1,
        unitOfMeasure: 'ct',
        weightMg: BigInt(400), // 2 carats = 400mg
        estimatedCostPaise: BigInt(4_000_000), // Rs 40,000
        wastagePercent: 0,
        sortOrder: 2,
      },
      {
        itemType: 'LABOR',
        description: 'Karigar Labor (master craftsman)',
        quantityRequired: 1,
        unitOfMeasure: 'job',
        weightMg: BigInt(0),
        estimatedCostPaise: BigInt(2_000_000), // Rs 20,000
        wastagePercent: 0,
        sortOrder: 3,
      },
    ],
  },

  KARIGAR: {
    name: 'Ramesh Kumar',
    specialization: 'Gold Jewelry',
    phone: '+919988776655',
    dailyRatePaise: 200_000, // Rs 2,000/day
    isActive: true,
  },

  // Material balance after manufacturing
  MATERIAL_BALANCE: {
    issuedMg: 50_000,      // 50g gold issued
    finishedPieceMg: 48_000, // 48g in finished piece
    wastageMg: 1_500,       // 1.5g wastage
    scrapMg: 500,           // 0.5g recoverable scrap
    // Balance check: 50000 - 48000 - 1500 - 500 = 0 (must be zero)
    balanceMg: 0,
  },
} as const;

// ─── Digital Gold Data ─────────────────────────────────────────

export const DIGITAL_GOLD = {
  // Buy spread: Rs 50 per 10g above market
  BUY_SPREAD_PER_10G_PAISE: 5_000,
  // Sell spread: Rs 50 per 10g below market
  SELL_SPREAD_PER_10G_PAISE: -5_000,

  SIP_MONTHLY: {
    amountPaise: 300_000,    // Rs 3,000/month
    frequency: 'MONTHLY',
  },

  // Simulated SIP executions at different rates
  SIP_EXECUTIONS: [
    {
      month: 1,
      ratePer10gPaise: 6_100_000, // Rs 61,000 per 10g
      ratePerGramPaise: 610_000,
      amountPaise: 300_000,
      // weight = (300000 * 1000) / 610000 = 491.8 -> 491 mg
      expectedWeightMg: 491,
    },
    {
      month: 2,
      ratePer10gPaise: 5_900_000, // Rs 59,000 per 10g
      ratePerGramPaise: 590_000,
      amountPaise: 300_000,
      // weight = (300000 * 1000) / 590000 = 508.4 -> 508 mg
      expectedWeightMg: 508,
    },
  ],
} as const;

// ─── Girvi (Gold Loan) Data ────────────────────────────────────

export const GIRVI = {
  LOAN: {
    collateralWeightMg: 50_000,    // 50g gold (22K)
    collateralPurity: 916,
    appraisedValuePaise: 29_000_000, // Rs 2,90,000 (at buy rate)
    ltvPercent: 75,                // Loan-to-value ratio
    principalPaise: 21_750_000,    // Rs 2,17,500
    interestRateAnnual: 1200,      // 12% (stored as x100)
    interestType: 'SIMPLE',
    // Monthly interest: 2,17,500 * 12% / 12 = Rs 2,175 = 217_500 paise
    monthlyInterestPaise: 217_500,
  },
} as const;

// ─── Kitty Scheme Data ─────────────────────────────────────────

export const KITTY_SCHEME = {
  GOLD_SAVINGS: {
    name: 'Golden Future Savings Scheme 2026',
    durationMonths: 12,
    monthlyInstallmentPaise: 500_000, // Rs 5,000/month
    bonusMonths: 1,                   // Pay 11, get 12
    totalPaidPaise: 5_500_000,        // Rs 55,000 (11 installments)
    bonusValuePaise: 500_000,         // Rs 5,000 bonus
    maturityValuePaise: 6_000_000,    // Rs 60,000 total
  },
} as const;

// ─── Export Order Data ─────────────────────────────────────────

export const EXPORT = {
  USD_EXCHANGE_RATE: 8_400, // Rs 84.00 (stored as x100 for precision)
  SAMPLE_ORDER: {
    buyerCountry: 'US',
    currencyCode: 'USD',
    // Order value in USD cents
    totalUsdCents: 500_000,  // $5,000
    // INR equivalent at 84.00
    totalInrPaise: 42_000_000, // Rs 4,20,000
    // IGST zero-rated with LUT for exports
    igstPaise: 0,
  },
} as const;

// ─── Coupon Data ───────────────────────────────────────────────

export const COUPONS = {
  FIRST10: {
    code: 'FIRST10',
    discountType: 'PERCENTAGE',
    discountValue: 1000, // 10% (stored as x100)
    maxDiscountPaise: 1_000_000, // Max Rs 10,000 discount
    minOrderPaise: 500_000,      // Min order Rs 5,000
    isFirstOrderOnly: true,
    usageLimit: 1,
    usedCount: 0,
  },
  ABANDONED5: {
    code: 'COMEBACK5',
    discountType: 'PERCENTAGE',
    discountValue: 500, // 5% (stored as x100)
    maxDiscountPaise: 500_000, // Max Rs 5,000
    minOrderPaise: 200_000,
    isFirstOrderOnly: false,
    usageLimit: 1,
    usedCount: 0,
  },
} as const;
