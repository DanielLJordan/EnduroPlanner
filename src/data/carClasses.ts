export interface CarClass {
  id: string
  label: string       // display name shown in UI
  aliases: string[]   // keys used in event carClasses arrays
  cars: string[]
}

export const CAR_CLASSES: CarClass[] = [
  {
    id: 'gtp',
    label: 'GTP / HYP',
    aliases: ['GTP', 'HYP'],
    cars: [
      'Cadillac V-Series.R GTP',
      'BMW M Hybrid V8',
      'Porsche 963',
      'Acura ARX-06 GTP',
      'Ferrari 499P',
    ],
  },
  {
    id: 'lmp2',
    label: 'LMP2',
    aliases: ['LMP2'],
    cars: [
      'ORECA 07',
      'Dallara P217 LMP2',
    ],
  },
  {
    id: 'gt3',
    label: 'GT3',
    aliases: ['GT3', 'GTD', 'GTD PRO'],
    cars: [
      'Porsche 911 GT3 R (992)',
      'Ferrari 296 GT3',
      'BMW M4 GT3',
      'Mercedes-AMG GT3',
      'McLaren 720S GT3 EVO',
      'Lamborghini Huracán GT3 EVO2',
      'Aston Martin Vantage GT3',
      'Ford Mustang GT3',
      'Corvette Z06 GT3.R',
      'Audi R8 LMS GT3 EVO II',
    ],
  },
  {
    id: 'gte',
    label: 'GTE',
    aliases: ['GTE'],
    cars: [
      'Ferrari 488 GTE Evo',
      'Porsche 911 RSR',
    ],
  },
  {
    id: 'gt4',
    label: 'GT4',
    aliases: ['GT4'],
    cars: [
      'Porsche 718 Cayman GT4 RS CS',
      'BMW M4 GT4',
      'McLaren 570S GT4',
      'Mercedes-AMG GT4',
      'Aston Martin Vantage GT4',
      'Maserati MC GT4',
      'Toyota GR Supra GT4 EVO',
      'Audi R8 LMS GT4',
    ],
  },
  {
    id: 'tcr',
    label: 'TCR',
    aliases: ['TCR'],
    cars: [
      'Audi RS 3 LMS TCR',
      'CUPRA Leon Competición TCR',
      'Honda Civic Type R TCR',
      'Hyundai Elantra N TCR',
    ],
  },
  {
    id: 'porsche-cup',
    label: 'Porsche Cup',
    aliases: ['Porsche Cup'],
    cars: [
      'Porsche 911 GT3 Cup (992)',
    ],
  },
  {
    id: 'supercars',
    label: 'Supercars',
    aliases: ['Supercars'],
    cars: [
      'Ford Mustang GT Supercar',
      'Chevrolet Camaro GT Supercar',
    ],
  },
]

/** Return the CarClass objects that are relevant for a given event's carClasses list */
export function getEventCarClasses(eventCarClasses: string[]): CarClass[] {
  return CAR_CLASSES.filter((cls) =>
    cls.aliases.some((alias) => eventCarClasses.includes(alias))
  )
}
