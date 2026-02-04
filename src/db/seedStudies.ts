import { db } from "./database";

export async function seedStudies() {
  const now = Date.now();
  
  // Example studies - categories are completely dynamic
  const exampleStudies = [
    // Health Studies
    {
      id: "health_diabetes_001",
      category: "Health",
      title: "Understanding Type 2 Diabetes: A Comprehensive Guide",
      subtitle: "Metabolic disorder analysis and management strategies",
      content: `## Pathophysiology of Type 2 Diabetes

Type 2 diabetes mellitus (T2DM) represents a complex metabolic disorder characterized by hyperglycemia resulting from insulin resistance and relative insulin deficiency. This condition develops when pancreatic β-cells cannot produce sufficient insulin to overcome insulin resistance, leading to persistent elevated blood glucose levels.

### Insulin Resistance Mechanisms

Insulin resistance primarily occurs at the level of insulin-sensitive tissues:
1. **Skeletal muscle**: Reduced glucose uptake due to impaired GLUT4 translocation
2. **Liver**: Increased hepatic glucose production despite hyperinsulinemia
3. **Adipose tissue**: Altered adipokine secretion and increased free fatty acid release

The molecular basis involves defects in insulin receptor signaling pathways, particularly the IRS-1/PI3K/Akt cascade. For detailed biochemical pathways, refer to: https://www.ncbi.nlm.nih.gov/books/NBK279115/

### Clinical Presentation and Diagnosis

Patients typically present with:
- Polyuria, polydipsia, and polyphagia
- Unexplained weight loss despite increased appetite
- Fatigue and blurred vision
- Slow-healing wounds and recurrent infections

Diagnostic criteria according to ADA guidelines:
- Fasting plasma glucose ≥126 mg/dL (7.0 mmol/L)
- 2-hour plasma glucose ≥200 mg/dL (11.1 mmol/L) during OGTT
- HbA1c ≥6.5% (48 mmol/mol)

### Management Strategies

#### Pharmacological Interventions
- **Metformin**: First-line therapy, reduces hepatic glucose production
- **SGLT2 inhibitors**: Promote glycosuria, cardiovascular benefits demonstrated
- **GLP-1 receptor agonists**: Enhance glucose-dependent insulin secretion
- **Insulin therapy**: Required in advanced disease with β-cell failure

#### Lifestyle Modifications
Comprehensive lifestyle intervention remains cornerstone therapy:
- **Diet**: Mediterranean or DASH diet patterns showing significant benefit
- **Exercise**: Minimum 150 minutes moderate-intensity weekly
- **Weight management**: 5-10% weight loss significantly improves insulin sensitivity

### Complications and Monitoring

Long-term complications require vigilant monitoring:
1. **Microvascular**: Retinopathy, nephropathy, neuropathy
2. **Macrovascular**: Increased cardiovascular disease risk
3. **Metabolic**: Diabetic ketoacidosis (rare in T2DM), hyperosmolar state

Regular screening includes:
- Annual retinal examination
- Urinary albumin-to-creatinine ratio
- Comprehensive foot examination
- Blood pressure and lipid profile monitoring

### Emerging Research Directions

Recent studies investigate:
- Gut microbiome modulation for glucose homeostasis
- Incretin-based therapies with weight loss benefits
- Continuous glucose monitoring technologies
- Personalized medicine approaches based on genetic profiling

For ongoing clinical trials: https://clinicaltrials.gov/ct2/results?cond=Type+2+Diabetes`,
      author: "Dr. James Wilson, MD",
      wordCount: 1450,
      isFeatured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "health_nutrition_001",
      category: "Health",
      title: "Nutritional Biochemistry: Macronutrient Metabolism",
      subtitle: "Comprehensive analysis of carbohydrate, protein, and lipid pathways",
      content: `## Carbohydrate Metabolism Pathways

### Glycolysis and Gluconeogenesis
The Embden-Meyerhof pathway converts glucose to pyruvate, generating ATP and NADH. Key regulatory enzymes include phosphofructokinase-1 (PFK-1) and pyruvate kinase. Research publications: https://www.sciencedirect.com/science/article/pii/S2213231721004567

### Pentose Phosphate Pathway
Generates NADPH for biosynthetic reactions and ribose-5-phosphate for nucleotide synthesis. Clinical significance in erythrocyte antioxidant defense.

## Protein Metabolism

### Amino Acid Catabolism
Transamination and deamination reactions convert amino acids to metabolic intermediates entering citric acid cycle. Urea cycle eliminates toxic ammonia.

### Protein Synthesis Regulation
mRNA translation regulated by mTOR pathway, responding to nutrient availability and growth signals.

## Lipid Metabolism

### Fatty Acid Oxidation
β-oxidation in mitochondrial matrix generates acetyl-CoA for energy production. Carnitine shuttle transports long-chain fatty acids into mitochondria.

### Cholesterol Homeostasis
HMG-CoA reductase rate-limiting enzyme in cholesterol synthesis. LDL receptor-mediated endocytosis regulates plasma cholesterol levels.

For comprehensive metabolic maps: https://www.genome.jp/kegg/pathway.html`,
      author: "Dr. Sarah Chen, PhD",
      wordCount: 850,
      isFeatured: false,
      createdAt: now - 86400000, // 1 day ago
      updatedAt: now,
    },

        // Bible Studies
    {
      id: "bible_natureofman_001",
      category: "Nature of Man",
      title: "The State of the Dead: Biblical Anthropology and Hope of Resurrection",
      subtitle: "A comprehensive biblical study on life, death, and the resurrection hope",
      content: `## Introduction to the Nature of Man and Death

Understanding the state of the dead requires a careful study of biblical anthropology—how Scripture defines human nature, life, death, and the future hope of resurrection. Many traditions assume humans possess inherent immortality, yet Scripture consistently presents life as dependent upon God.

### Creation of Man: The Foundation of Human Nature

#### Humanity as a Living Soul
Genesis 2:7 provides the foundational definition of human life:

God formed man from the dust of the ground and breathed into his nostrils the breath of life, and man became a living soul.

The biblical formula is clear:
- **Dust of the ground**: The physical body
- **Breath of life**: Life energy from God
- **Result**: A living being or soul

Man does not possess a soul as a separate entity; rather, man *is* a living soul. Life is therefore conditional upon God's sustaining power.

#### Death as the Reversal of Creation
Ecclesiastes 12:7 describes death as the reversal of creation:
- The body returns to dust.
- The breath returns to God who gave it.

Death is thus the undoing of life, not transition into another conscious existence.

### Biblical Description of the State of the Dead

#### Absence of Conscious Activity
Scripture repeatedly affirms that the dead are unconscious:

- **Ecclesiastes 9:5** — The dead know nothing.
- **Ecclesiastes 9:10** — There is no work, knowledge, or wisdom in the grave.
- **Psalm 146:4** — Human thoughts perish at death.

These passages show death as a state of unconscious rest, not active awareness.

#### Death as Sleep
Jesus frequently described death as sleep:

- Jesus said Lazarus "sleeps" before raising him (John 11:11–14).
- Old Testament kings are repeatedly said to have "slept with their fathers."

Sleep symbolizes unconscious rest with the expectation of awakening at resurrection.

### Immortality Belongs to God Alone

#### Conditional Immortality
1 Timothy 6:15–16 declares that God alone possesses immortality. Humanity does not inherently possess eternal life; it is a gift granted through Christ (Romans 6:23).

Believers receive immortality at the resurrection, not at death.

#### Resurrection as the Christian Hope
Paul clarifies in 1 Corinthians 15 that:
- If there is no resurrection, faith is meaningless.
- Immortality is granted at Christ's return.
- The dead are raised incorruptible.

The biblical hope centers not on escape of the soul but on bodily resurrection.

### Misunderstandings and Interpretive Challenges

#### The Rich Man and Lazarus
Luke 16 presents a parable employing contemporary imagery to teach moral accountability, not a literal description of the afterlife. Interpreting it literally would contradict clear teachings about death's unconscious state.

#### "Today You Will Be With Me in Paradise"
In Luke 23:43, punctuation influences interpretation. The promise assures future presence with Christ, consistent with resurrection hope rather than immediate postmortem reward.

### Practical Implications of the Doctrine

Understanding the state of the dead provides:

1. **Freedom from fear of spirits or ghosts**
2. **Clarity regarding resurrection hope**
3. **Consistency in biblical interpretation**
4. **Comfort that the dead rest peacefully awaiting resurrection**

This teaching also safeguards against deception related to claims of communication with the dead.

### Eschatological Hope: The Resurrection

#### Christ's Return and Awakening of the Dead
1 Thessalonians 4:16–17 describes Christ's return:
- The dead in Christ rise first.
- Living believers join them.
- Together they meet the Lord.

This event marks the restoration of life and fulfillment of salvation hope.

#### Death Defeated
Revelation ultimately portrays death itself being destroyed, demonstrating that death is an enemy to be overcome, not a doorway to fuller life.

### Contemporary Theological Discussion

Modern scholarship increasingly revisits biblical anthropology, recognizing that Scripture portrays humans as unified beings rather than separable body and soul.

Studies in Hebrew thought and Second Temple Judaism further support the understanding of death as unconscious rest pending resurrection.

Recommended academic resources: https://www.atsjats.org/publications

### Conclusion

The biblical doctrine of the state of the dead harmonizes creation, death, and resurrection into a coherent message of hope. Humanity does not possess inherent immortality; eternal life is God's gift granted through Christ at the resurrection.

Thus, the believer's hope rests not in immediate postmortem consciousness, but in the glorious promise: Christ will return, the dead will rise, and life will be restored forever.`,
      author: "Dr. Michael Thompson, ThD",
      wordCount: 3100,
      isFeatured: false,
      createdAt: now - 172800000, // 2 days ago
      updatedAt: now,
    },

    // Bible Studies
    {
      id: "bible_sanctuary_001",
      category: "Bible Studies",
      title: "The Heavenly Sanctuary: Typology and Eschatology",
      subtitle: "Comprehensive exegetical study of sanctuary symbolism in Scripture",
      content: `## Introduction to Sanctuary Typology

The sanctuary system established in Exodus represents one of Scripture's most profound typological systems, providing a comprehensive visual representation of salvation history and Christ's redemptive work.

### The Earthly Sanctuary: A Shadow of Heavenly Reality

#### Architectural Symbolism
The tripartite structure (outer court, holy place, most holy place) systematically reveals the plan of redemption:
- **Outer Court**: Represents earth, the sphere of Christ's sacrifice
- **Holy Place**: Represents Christ's intercessory ministry
- **Most Holy Place**: Represents God's throne room and final judgment

According to Hebrews 8:5, the earthly sanctuary served as "a copy and shadow of the heavenly things," a principle foundational to proper hermeneutical approach.

#### Furnishings and Their Significance
Each sanctuary article conveyed specific theological truth:
1. **Altar of Burnt Offering**: Christ's atoning sacrifice (Hebrews 10:10-12)
2. **Laver**: Spiritual cleansing through baptism (Ephesians 5:26)
3. **Table of Showbread**: Christ as bread of life (John 6:35)
4. **Golden Lampstand**: Holy Spirit illumination (Revelation 4:5)
5. **Altar of Incense**: Intercessory prayer (Revelation 8:3-4)
6. **Ark of the Covenant**: God's presence and law (Revelation 11:19)

### Christological Fulfillment

#### Priestly Ministry of Christ
Hebrews presents Jesus as superior high priest according to Melchizedek's order (Hebrews 7:1-28). His ministry encompasses:
- **Once-for-all sacrifice** on Calvary (Hebrews 9:26)
- **Continual intercession** at God's right hand (Hebrews 7:25)
- **Sanctuary cleansing** ministry (Daniel 8:14; Hebrews 9:23)

The book of Hebrews systematically demonstrates how Christ's ministry fulfills and transcends the Levitical system.

### Eschatological Significance

#### Daniel 8:14 and Investigative Judgment
The 2300-day prophecy culminating in 1844 marks the beginning of Christ's final phase of sanctuary ministry—the investigative judgment preceding His second advent.

This doctrine integrates multiple biblical themes:
- **Typology**: Day of Atonement antitype (Leviticus 16)
- **Prophecy**: Time prophecies of Daniel
- **Eschatology**: Pre-advent judgment scenes (Daniel 7:9-10; Revelation 14:6-7)

#### Practical Implications for Today
Understanding sanctuary theology provides:
1. **Assurance of salvation** through Christ's ongoing ministry
2. **Motivation for holy living** in light of judgment
3. **Clarity regarding end-time events**
4. **Comprehensive framework** for understanding Scripture's unity

### Contemporary Scholarship and Resources

Recent archaeological discoveries and textual studies continue to illuminate sanctuary understanding:
- Qumran texts providing intertestamental context
- ANE comparative studies clarifying ritual practices
- Systematic theological integration with Pauline soteriology

Recommended academic resources: https://www.atsjats.org/publications

### Conclusion

The sanctuary message remains "present truth" for God's end-time people, offering a comprehensive understanding of salvation history and motivating preparation for Christ's imminent return.`,
      author: "Dr. Michael Thompson, ThD",
      wordCount: 3200,
      isFeatured: true,
      createdAt: now - 172800000, // 2 days ago
      updatedAt: now,
    },
    {
      id: "bible_creation_001",
      category: "Bible Studies",
      title: "Genesis Cosmogony: Exegetical and Scientific Perspectives",
      subtitle: "Critical analysis of creation narratives in dialogue with modern science",
      content: `## Literary Analysis of Genesis 1-2

### Structural and Stylistic Features
The creation account employs sophisticated literary structures:
- **Chiastic patterns** emphasizing divine order
- **Numerical symbolism** (seven-day structure)
- **Theological repetition** establishing divine sovereignty

### Comparative Ancient Near Eastern Context
Contrasting Genesis with contemporary creation myths (Enuma Elish, Atrahasis) reveals distinctive monotheistic theology.

## Theological Implications

### Creation Ex Nihilo Doctrine
Biblical foundation for creatio ex nihilo contrasts with pantheistic and dualistic cosmogonies.

### Imago Dei Anthropology
Humanity's unique creation in God's image establishes intrinsic worth and stewardship responsibility.

## Scientific Dialogue

### Cosmology and Genesis
Big Bang cosmology's temporal beginning aligns with biblical creation concept, though interpretive frameworks vary.

### Biological Diversity and Kinds
Analysis of created "kinds" (Hebrew: min) in relation to modern taxonomy and speciation theories.

For interdisciplinary research: https://biologos.org`,
      author: "Dr. Robert Johnson, PhD",
      wordCount: 1800,
      isFeatured: false,
      createdAt: now - 259200000, // 3 days ago
      updatedAt: now,
    },

    
    // Prophecy Studies
    {
      id: "prophecy_daniel_001",
      category: "Prophecy",
      title: "Daniel 7: Exegetical Analysis of Apocalyptic Vision",
      subtitle: "Comprehensive interpretation of four-beast prophecy and eschatological implications",
      content: `## Introduction to Daniel's Apocalyptic Section

Daniel 7 marks transition from historical narrative (chapters 1-6) to apocalyptic vision (chapters 7-12), introducing symbolic prophecy that becomes paradigmatic for biblical apocalyptic literature.

### Literary Structure and Setting

The vision received "in the first year of Belshazzar" (553 BC) provides eschatological framework complementing Nebuchadnezzar's dream in chapter 2 while advancing theological themes.

## The Four Beasts: Symbolic Interpretation

### First Beast: Lion with Eagle's Wings
- **Symbolism**: Babylonian Empire (Jeremiah 4:7; 49:19-22)
- **Wings plucked**: Nebuchadnezzar's humiliation (Daniel 4:31-33)
- **Human heart given**: Restoration and acknowledgment of divine sovereignty

### Second Beast: Bear Raised on One Side
- **Symbolism**: Medo-Persian Empire
- **Three ribs**: Conquered kingdoms (Lydia, Babylon, Egypt)
- **Dominion command**: Persian imperial expansion under Cyrus

### Third Beast: Leopard with Four Wings and Heads
- **Symbolism**: Greek Empire under Alexander
- **Four wings**: Rapid conquest (334-323 BC)
- **Four heads**: Division among Diadochi (Cassander, Lysimachus, Ptolemy, Seleucus)

### Fourth Beast: Dreadful and Terrible
- **Symbolism**: Roman Empire
- **Iron teeth**: Military strength and legal system
- **Ten horns**: Division following empire's collapse
- **Little horn**: Papal supremacy emerging from Roman context

## Eschatological Framework

### Ancient of Days Scene (Daniel 7:9-10)
Theophanic vision establishing divine sovereignty over human history, with judgment scene preparing for kingdom transfer.

### Son of Man Investiture (Daniel 7:13-14)
Messianic title appropriated by Jesus (Matthew 24:30; 26:64) indicating:
- **Divine authority** (receiving worship)
- **Universal dominion** (everlasting kingdom)
- **Eschatological fulfillment** in Christ's ministry

### Kingdom Given to Saints (Daniel 7:18, 27)
Eschatological hope of divine vindication and eternal reign, realized progressively through church history and consummated at second advent.

## Historical-Fulfillment Correlation

### Roman Empire Context
Little horn's characteristics align historically with papal development:
- **Speaking pompous words**: Papal claims to authority
- **Making war with saints**: Medieval persecution
- **Changing times and law**: Sunday legislation

### Protestant Reformation Interpretation
Reformers (Luther, Calvin) identified little horn with papacy, establishing historicist hermeneutic for apocalyptic prophecy.

## Contemporary Application

### Hermeneutical Principles
Daniel 7 establishes interpretive paradigms for:
- **Symbolic-prophetic correlation**
- **Dual-fulfillment patterns**
- **Historical-continuity principle**

### Eschatological Expectation
The vision motivates:
- **Vigilance** regarding end-time developments
- **Faithfulness** during persecution
- **Hope** in Christ's ultimate victory

## Academic Resources and Further Study

Recommended scholarly works and archaeological resources available at: https://www.sbl-site.org

## Conclusion

Daniel 7 provides comprehensive apocalyptic framework essential for understanding biblical eschatology, demonstrating God's sovereignty over empires and assuring ultimate triumph of His kingdom.`,
      author: "Dr. Elizabeth Martinez, PhD",
      wordCount: 2850,
      isFeatured: true,
      createdAt: now - 345600000, // 4 days ago
      updatedAt: now,
    },
    {
      id: "prophecy_revelation_001",
      category: "Prophecy",
      title: "Revelation 13: Beast Imagery and Contemporary Applications",
      subtitle: "Exegetical study of apocalyptic symbols in modern context",
      content: `## Introduction to Revelation's Beast Imagery

Revelation 13 continues Daniel's apocalyptic tradition, employing beast symbolism to depict end-time religious-political powers opposing God's people.

### Literary Context and Structure
The chapter divides between sea beast (13:1-10) and earth beast (13:11-18), presenting complementary oppressive systems.

## First Beast: Sea Beast Analysis

### Composite Symbolism
Integration of Daniel's four beasts (leopard, bear, lion, dragon) indicates comprehensive opposition encompassing all historical persecuting powers.

### Historical Correlations
Reformation interpretation identifying sea beast with papal system, supported by:
- **42-month timeframe**: 1260-year period of dominance
- **Blasphemous claims**: Papal titles and authority assertions
- **Martyrdom of saints**: Medieval persecution records

### Contemporary Manifestations
Modern expressions of religious authoritarianism and state-enforced conformity to false worship systems.

## Second Beast: Earth Beast Interpretation

### Lamb-like Appearance
Deceptive resemblance to Christ, representing false religious systems masquerading as Christian.

### Miracle-working Power
Spiritual deception through signs and wonders, warning against truth evaluation based solely on miraculous manifestations.

### Image to the Beast
Enforced conformity to sea beast's worship system through political-religious collaboration.

## Mark of the Beast Theology

### Theological Significance
The mark represents allegiance to beast power versus God's authority, contrasting with seal of God (Revelation 7:2-3).

### Contemporary Applications
Modern identification involves:
- **Theological principles** rather than specific technology
- **Worship issues** at core of conflict
- **End-time obedience** to God's commandments

## Hermeneutical Considerations

### Symbolic Interpretation Principles
- **Biblical symbolism consistency**
- **Historical fulfillment patterns**
- **Contemporary application relevance**

### Avoidance of Speculative Excess
Balancing prophetic understanding with Christ-centered focus and practical Christian living.

## Practical Implications for Today

### Discernment in Complex Times
Developing biblical discernment regarding:
- **Religious authority claims**
- **State-religion relationships**
- **End-time deception methods**

### Faithful Witness Preparation
Equipping for potential persecution through:
- **Theological grounding**
- **Community support systems**
- **Spiritual resilience development**

## Conclusion

Revelation 13 provides essential framework for understanding end-time religious conflicts, emphasizing faithful allegiance to Christ amid escalating spiritual warfare.`,
      author: "Dr. Thomas Wright, ThD",
      wordCount: 1950,
      isFeatured: false,
      createdAt: now - 432000000, // 5 days ago
      updatedAt: now,
    },
  ];

  // Insert study categories as they appear (completely dynamic)
  const uniqueCategories = [...new Set(exampleStudies.map(s => s.category))];

  await db.withTransactionAsync(async () => {
    for (const category of uniqueCategories) {
      await db.runAsync(
        `INSERT OR IGNORE INTO study_categories (name, displayName, createdAt) VALUES (?, ?, ?)`,
        [category, category, now]
      );
    }

    // Insert studies
    for (const study of exampleStudies) {
      await db.runAsync(
        `INSERT OR REPLACE INTO studies
          (id, category, title, subtitle, content, author, wordCount, isFeatured, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          study.id,
          study.category,
          study.title,
          study.subtitle,
          study.content,
          study.author,
          study.wordCount,
          study.isFeatured ? 1 : 0,
          study.createdAt,
          study.updatedAt,
        ]
      );
    }
  });

  console.log(`Seeded ${exampleStudies.length} studies with ${uniqueCategories.length} categories`);
}
