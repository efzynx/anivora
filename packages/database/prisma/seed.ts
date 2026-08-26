import { PrismaClient, ContentType, ContentStatus, ProviderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ANIVORA database seed...');

  // 1. Seed Genres
  const genres = [
    { name: 'Action', slug: 'action' },
    { name: 'Adventure', slug: 'adventure' },
    { name: 'Comedy', slug: 'comedy' },
    { name: 'Drama', slug: 'drama' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Isekai', slug: 'isekai' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Shounen', slug: 'shounen' },
    { name: 'Romance', slug: 'romance' },
    { name: 'Cultivation', slug: 'cultivation' },
  ];

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  console.log(`✅ Seeded ${genres.length} genres.`);

  // 2. Seed Default Providers
  const providers = [
    {
      name: 'OtakuDesu Provider',
      slug: 'otakudesu',
      type: 'HTML_SCRAPER',
      status: ProviderStatus.ONLINE,
      priority: 1,
      baseUrl: 'https://otakudesu.cloud',
      supportsAnime: true,
      supportsDonghua: false,
    },
    {
      name: 'Anichin Provider',
      slug: 'anichin',
      type: 'HTML_SCRAPER',
      status: ProviderStatus.ONLINE,
      priority: 2,
      baseUrl: 'https://anichin.site',
      supportsAnime: false,
      supportsDonghua: true,
    },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: {},
      create: provider,
    });
  }
  console.log(`✅ Seeded ${providers.length} default providers.`);

  // 3. Seed Sample Content (One Piece & Solo Leveling)
  const actionGenre = await prisma.genre.findUnique({ where: { slug: 'action' } });
  const fantasyGenre = await prisma.genre.findUnique({ where: { slug: 'fantasy' } });

  const onePiece = await prisma.content.upsert({
    where: { slug: 'one-piece' },
    update: {},
    create: {
      slug: 'one-piece',
      title: 'One Piece',
      nativeTitle: 'ワンピース',
      altTitles: ['OP', 'Wan Pisu'],
      type: ContentType.ANIME,
      status: ContentStatus.ONGOING,
      releaseYear: 1999,
      synopsis: 'Monkey D. Luffy berlayar mengarungi Grand Line untuk menemukan harta karun legendaris One Piece dan menjadi Raja Bajak Laut.',
      rating: 8.9,
      posterUrl: 'https://cdn.anivora.app/posters/one-piece-md.webp',
      backdropUrl: 'https://cdn.anivora.app/backdrops/one-piece.webp',
      totalEpisodes: 1140,
      isFeatured: true,
      popularity: 99999,
    },
  });

  if (actionGenre && fantasyGenre) {
    await prisma.contentGenre.upsert({
      where: { contentId_genreId: { contentId: onePiece.id, genreId: actionGenre.id } },
      update: {},
      create: { contentId: onePiece.id, genreId: actionGenre.id },
    });
    await prisma.contentGenre.upsert({
      where: { contentId_genreId: { contentId: onePiece.id, genreId: fantasyGenre.id } },
      update: {},
      create: { contentId: onePiece.id, genreId: fantasyGenre.id },
    });
  }

  // Seed sample episode for One Piece
  const episode1140 = await prisma.episode.upsert({
    where: { slug: 'one-piece-episode-1140' },
    update: {},
    create: {
      contentId: onePiece.id,
      episodeNumber: 1140,
      title: 'Episode 1140: Battle on Egghead',
      slug: 'one-piece-episode-1140',
      durationSeconds: 1440,
      thumbnailUrl: 'https://cdn.anivora.app/thumbs/op-1140.webp',
      airDate: new Date(),
    },
  });

  // Episode Subtitles
  await prisma.subtitle.createMany({
    data: [
      {
        episodeId: episode1140.id,
        language: 'Indonesian',
        languageCode: 'id',
        format: 'VTT',
        url: 'https://cdn.anivora.app/subs/op-1140-id.vtt',
        isDefault: true,
      },
      {
        episodeId: episode1140.id,
        language: 'English',
        languageCode: 'en',
        format: 'VTT',
        url: 'https://cdn.anivora.app/subs/op-1140-en.vtt',
        isDefault: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeded sample Anime and Episode data.');
  console.log('✨ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
