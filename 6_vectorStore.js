// =====================================================================
// 6_vectorStore.js — PDF → Chunks → Embeddings → Pinecone
// =====================================================================
//
// FLOW:
//   1. Parse PDF → raw text
//   2. Split text into chunks (by separator)
//   3. Embed each chunk using Gemini embedding API
//   4. Upsert to Pinecone
//
// WHY NOT @langchain/pinecone?
//   @langchain/pinecone requires @langchain/core < 0.4.0
//   but we use @langchain/core 1.x. Incompatible. No fix yet.
//   So we use Pinecone SDK directly — it's just one upsert call.
// =====================================================================

// import fs from "fs";
// import pdf from "pdf-parse/lib/pdf-parse.js";
// import { embedText, pineconeIndex } from "./2_config.js";

// // ── Constants ──
// const EMBED_CONCURRENCY = 5;
// const EMBED_DELAY_MS = 500;
// const UPSERT_BATCH_SIZE = 100;

// // =====================================================================
// // STEP 1: Parse PDF → Raw Text
// // =====================================================================
// async function parsePDF(pdfPath) {
//   const buffer = fs.readFileSync(pdfPath);
//   const data = await pdf(buffer);
//   console.log(`   📄 Parsed PDF: ${data.numpages} pages, ~${data.text.length} characters`);
//   return data.text;
// }

// // =====================================================================
// // STEP 2: Chunk Text
// // =====================================================================
// function chunkText(rawText) {
//   const blocks = rawText.split(/\n-{5,}\n/);

//   const chunks = [];
//   for (const block of blocks) {
//     const text = block.trim();
//     if (!text || text.length < 20) continue;
//     chunks.push(text);
//   }

//   return chunks;
// }

// // =====================================================================
// // STEP 3: Embed with Retry
// // =====================================================================
// async function embedWithRetry(text, maxRetries = 3) {
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       return await embedText(text);
//     } catch (err) {
//       const is429 = err.message?.includes("429");
//       const wait = is429 ? attempt * 20 : attempt * 5;
//       if (attempt < maxRetries) {
//         console.warn(`   ⚠️ Embed failed (attempt ${attempt}). Waiting ${wait}s...`);
//         await new Promise((r) => setTimeout(r, wait * 1000));
//       } else {
//         console.error(`   ❌ Embed permanently failed:`, err.message?.substring(0, 100));
//         return null;
//       }
//     }
//   }
// }

// // =====================================================================
// // MAIN: Parse → Chunk → Embed → Upsert
// // =====================================================================
// async function buildVectorStore(pdfPath) {
//   console.log(`\n📐 Building vector store from PDF...`);
//   console.log(`   ⚡ Concurrency: ${EMBED_CONCURRENCY} parallel embeddings\n`);

//   const startTime = Date.now();

//   // Step 1: Parse PDF
//   console.log("   📄 Step 1: Parsing PDF...");
//   const rawText = await parsePDF(pdfPath);

//   // Step 2: Chunk
//   console.log("   ✂️  Step 2: Chunking text...");
//   const chunks = chunkText(rawText);
//   console.log(`   ✅ Created ${chunks.length} chunks`);

//   if (chunks.length === 0) {
//     console.error("   ❌ No chunks created! Check PDF format.");
//     return;
//   }

//   // Step 3: Embed all chunks (5 concurrent)
//   console.log(`\n   🧠 Step 3: Embedding ${chunks.length} chunks...`);

//   const vectors = []; // { id, values, metadata }
//   let failCount = 0;

//   for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
//     const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
//     const roundNum = Math.floor(i / EMBED_CONCURRENCY) + 1;
//     const totalRounds = Math.ceil(chunks.length / EMBED_CONCURRENCY);

//     if ((roundNum - 1) % 10 === 0 || roundNum === totalRounds) {
//       console.log(`   🔄 Round ${roundNum}/${totalRounds} (chunks ${i + 1}-${Math.min(i + EMBED_CONCURRENCY, chunks.length)})...`);
//     }

//     const results = await Promise.all(
//       batch.map(async (text, j) => {
//         const embedding = await embedWithRetry(text);
//         if (!embedding) return null;
//         return {
//           id: `chunk-${i + j}`,
//           values: embedding,
//           metadata: { text },
//         };
//       })
//     );

//     for (const r of results) {
//       if (r) vectors.push(r);
//       else failCount++;
//     }

//     // Rate limit pause between rounds
//     if (i + EMBED_CONCURRENCY < chunks.length) {
//       await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
//     }
//   }

//   const embedTime = ((Date.now() - startTime) / 1000).toFixed(1);
//   console.log(`\n   ✅ Embedded ${vectors.length}/${chunks.length} in ${embedTime}s (${failCount} failed)`);

//   if (vectors.length === 0) {
//     console.error("   ❌ No vectors to upsert!");
//     return;
//   }

//   // Step 4: Upsert to Pinecone
//   // Pinecone SDK v5 format: pineconeIndex.upsert(arrayOfVectors)
//   // Each vector: { id: string, values: number[], metadata?: object }
//   console.log(`\n   📦 Step 4: Upserting to Pinecone...`);
//   for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
//     const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
//     const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
//     const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);

//     console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);

//     // Pinecone v5: .upsert() takes an array of vectors directly
//     await pineconeIndex.upsert(batch);
//   }

//   const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
//   const stats = await pineconeIndex.describeIndexStats();
//   console.log(`\n✅ Vector store built in ${totalTime}s! Total vectors: ${stats.totalRecordCount}`);
// }

// export { buildVectorStore };

// 17 thaka 162 no line purono code jata pdf thaka vector db ta data dhuka66ilo 




// =====================================================================
// 6_vectorStore.js — Neo4j Movies → Embeddings → Pinecone
// =====================================================================

import { driver, embedText, pineconeIndex } from "./2_config.js";

// ── Constants ──
const EMBED_CONCURRENCY = 5;
const EMBED_DELAY_MS = 500;
const UPSERT_BATCH_SIZE = 100;

// =====================================================================
// STEP 1: Read existing Movies from Neo4j
// =====================================================================

async function getMoviesFromNeo4j() {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (m:Movie)

      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
      OPTIONAL MATCH (m)-[:EXPLORES]->(t:Theme)
      OPTIONAL MATCH (m)-[:WON]->(aw:Award)

      RETURN
        m.title AS title,
        m.year AS year,
        collect(DISTINCT d.name) AS directors,
        collect(DISTINCT a.name) AS actors,
        collect(DISTINCT g.name) AS genres,
        collect(DISTINCT t.name) AS themes,
        collect(DISTINCT aw.name) AS awards

      ORDER BY title
    `);

    const movies = result.records.map((record) => ({
      title: record.get("title"),
      year: record.get("year"),
      directors: record.get("directors"),
      actors: record.get("actors"),
      genres: record.get("genres"),
      themes: record.get("themes"),
      awards: record.get("awards"),
    }));

    console.log(`   🎬 Movies loaded from Neo4j: ${movies.length}`);

    return movies;
  } finally {
    await session.close();
  }
}

function makeMovieId(title) {
  return `movie-${title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}


// =====================================================================
// STEP 2: Convert Movie → Embedding Text
// =====================================================================
function movieToText(movie) {
  return `
Title: ${movie.title}
Release Year: ${movie.year ?? "Unknown"}
Director: ${movie.directors.join(", ") || "Unknown"}
Actors: ${movie.actors.join(", ") || "Unknown"}
Genres: ${movie.genres.join(", ") || "Unknown"}
Themes: ${movie.themes.join(", ") || "Unknown"}
Awards: ${movie.awards.join(", ") || "None"}
`.trim();
}

// =====================================================================
// STEP 3: Embed with Retry
// =====================================================================

async function embedWithRetry(text, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await embedText(text);
    } catch (err) {
      const is429 = err.message?.includes("429");
      const wait = is429 ? attempt * 20 : attempt * 5;

      if (attempt < maxRetries) {
        console.warn(
          `   ⚠️ Embed failed (attempt ${attempt}). Waiting ${wait}s...`
        );

        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        console.error(
          `   ❌ Embed permanently failed:`,
          err.message?.substring(0, 100)
        );

        return null;
      }
    }
  }
}

// =====================================================================
// MAIN: Neo4j → Movie Text → Embed → Pinecone
// =====================================================================

async function buildVectorStore() {
  console.log(`\n📐 Building vector store from Neo4j...`);
  console.log(
    `   ⚡ Embedding concurrency: ${EMBED_CONCURRENCY} parallel embeddings\n`
  );

  const startTime = Date.now();

  // ---------------------------------------------------------------
  // Step 1: Read Movies from Neo4j
  // ---------------------------------------------------------------

  console.log("   📊 Step 1: Reading existing Movies from Neo4j...");

  const movies = await getMoviesFromNeo4j();

  if (movies.length === 0) {
    console.error("   ❌ No Movie nodes found in Neo4j!");
    return;
  }

  // ---------------------------------------------------------------
  // Step 2: Prepare movie texts
  // ---------------------------------------------------------------

  console.log("\n   📝 Step 2: Preparing movie texts...");

  const movieTexts = movies.map((movie) => ({
    movie,
    text: movieToText(movie),
  }));

  console.log(`   ✅ Prepared ${movieTexts.length} movie texts`);

  // ---------------------------------------------------------------
  // Step 3: Embed Movies
  // ---------------------------------------------------------------
  console.log(
    `\n   🧠 Step 3: Embedding ${movieTexts.length} movies...`
  );

  const vectors = [];
  let failCount = 0;

  for (
    let i = 0;
    i < movieTexts.length;
    i += EMBED_CONCURRENCY
  ) {
    const batch = movieTexts.slice(i, i + EMBED_CONCURRENCY);

    const roundNum = Math.floor(i / EMBED_CONCURRENCY) + 1;
    const totalRounds = Math.ceil(
      movieTexts.length / EMBED_CONCURRENCY
    );

    console.log(
      `   🔄 Round ${roundNum}/${totalRounds} ` +
      `(movies ${i + 1}-${Math.min(
        i + EMBED_CONCURRENCY,
        movieTexts.length
      )})...`
    );

    const results = await Promise.all(
      batch.map(async ({ movie, text }, j) => {
        const embedding = await embedWithRetry(text);

        if (!embedding) return null;

        return {
          id: makeMovieId(movie.title),
          values: embedding,

          metadata: {
            title: movie.title,
            year: movie.year ?? 0,
            director: movie.directors.join(", "),
            actors: movie.actors.join(", "),
            genres: movie.genres.join(", "),
            themes: movie.themes.join(", "),
            awards: movie.awards.join(", "),
            text,
          },
        };
      })
);

    for (const vector of results) {
      if (vector) {
        vectors.push(vector);
      } else {
        failCount++;
      }
    }

    if (i + EMBED_CONCURRENCY < movieTexts.length) {
      await new Promise((r) =>
        setTimeout(r, EMBED_DELAY_MS)
      );
    }
  }

  const embedTime = (
    (Date.now() - startTime) /
    1000
  ).toFixed(1);

  console.log(
    `\n   ✅ Embedded ${vectors.length}/${movieTexts.length} movies`
  );

  console.log(`   ⏱️ Embedding time: ${embedTime}s`);
  console.log(`   ❌ Failed: ${failCount}`);

  if (vectors.length === 0) {
    console.error("   ❌ No vectors created!");
    return;
  }

  // ---------------------------------------------------------------
  // Step 4: Upsert to Pinecone
  // ---------------------------------------------------------------

  console.log("\n   📦 Step 4: Upserting vectors to Pinecone...");

  for (
    let i = 0;
    i < vectors.length;
    i += UPSERT_BATCH_SIZE
  ) {
    const batch = vectors.slice(
      i,
      i + UPSERT_BATCH_SIZE
    );

    const batchNum =
      Math.floor(i / UPSERT_BATCH_SIZE) + 1;

    const totalBatches = Math.ceil(
      vectors.length / UPSERT_BATCH_SIZE
    );

    console.log(
      `   📦 Batch ${batchNum}/${totalBatches} ` +
      `(${batch.length} vectors)...`
    );

    await pineconeIndex.upsert(batch);
  }

  // ---------------------------------------------------------------
  // Step 5: Verify
  // ---------------------------------------------------------------

  const stats =
    await pineconeIndex.describeIndexStats();
  console.log(
    `\n✅ Vector store built successfully!`
  );

  console.log(
    `   📊 Pinecone total vectors: ${stats.totalRecordCount}`
  );
}

export { buildVectorStore };