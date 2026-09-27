# Author: Alex Picon <alexnpc@me.com>
"""Curated family literature: distinguish supplied recollections from inspired fiction."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'apps/keeper/stories/lima'
SOURCE = """I loved when my grandpa told me stories about work, his friends, accidents, how people protect each other. He was a stevedore in Latinamerica. Similarly my grandma told me stories about family sickness, hunger, how my grandpa worked so hard and he came home with some bread but my mom asked for butter and he left crying because he couldn't afford it, stories of cancer. Family overcame everything, even after so many setbacks. Those stories formed me. We grew up in Lima Peru.

I remember how my grandma told me a story when I asked her what made her faith so strong, and it was that once when they had a sick kid and didn't have enough to even eat, she was walking home praying to the virgin mary for help, and she found a large bill that saved them. To me it was just a coincidence, some random bill she found, but to my grandma it was a defining moment that made the virgin mary as real as any person in the family

you can mix the story about my grandpa working hard in the docks to buy a bag of bread and my 4yrold mom thanking him and asking for bread, so he cried, and my grandma walked and found the bill

She asked for butter

my grandma prayed to the virgen del carmen de la legua in callao, not the virgen de guadalupe. We're peruvian, not mexican"""

BREAD = [('The work before the bread',
  'Your grandfather worked hard at the docks. He was my husband, and the children who needed feeding were '
  'our children. He could give his strength to a whole day and still come home with less than he wanted to '
  'bring.\n'
  '\n'
  'That was not because he had forgotten us. We were the reason he was trying.\n'
  '\n'
  'So when I tell you he came home with a bag of bread, remember the work that came before it. Before your '
  "mother's question, before his tears, there was a father doing what he could for his family."),
 ('Our little girl',
  'Your mother was four years old. When I remember this, I see our little girl, not yet the woman you know.\n'
  '\n'
  'Her father came home with bread, and she thanked him. Keep that part with you. She was glad for what he '
  'had brought.\n'
  '\n'
  'She did not know what his wages could cover, or what we had gone without. She knew she was hungry, and '
  'she knew the person she turned to when she wanted something.\n'
  '\n'
  'For a moment, it was simply a father bringing food and his little girl receiving it with thanks.'),
 ('And then she asked for butter',
  'After thanking him for the bread, your mother asked for butter.\n'
  '\n'
  "She was only four. She was not trying to wound him. She had a child's wish and asked her father for it, "
  'because she trusted him.\n'
  '\n'
  'But he could not afford the butter. He had worked so hard, and still there was something ordinary he '
  'could not give his little girl.\n'
  '\n'
  'Do not remember her question as unkindness, or his pain as a failure of love. He loved her. She trusted '
  'him. Between those two things stood the money we did not have.'),
 ('When he went out',
  'Your grandfather went out crying. He could not afford what she had asked for.\n'
  '\n'
  'The hands that worked at the docks belonged to a father. His strength there did not make him unable to '
  'hurt at home.\n'
  '\n'
  "The bread still mattered. So did his work, and our little girl's thanks. But wanting to give your child "
  'something and being unable to give it can break through the strength you have been using all day.\n'
  '\n'
  'Remember what he carried when he came in. He had not arrived empty-handed, and he had not arrived without '
  'love.'),
 ('The prayer on my way home',
  'There was a time when we had a sick child and not enough even to eat. I was walking home, praying to la '
  'Virgen del Carmen de la Legua, in Callao, for help.\n'
  '\n'
  'The worry came with me. Our child needed care, our family needed food, and I could not make those needs '
  'smaller by walking.\n'
  '\n'
  'So I brought to her what I could not solve alone. I did not need beautiful words. I needed help for my '
  'family.\n'
  '\n'
  'When you ask why my faith became so strong, I return to that walk. I was praying, and then I found the '
  'money.'),
 ('The bill I found',
  'It was a large bill—enough to help us when we had so little. I have always remembered finding it as the '
  'thing that saved us in that moment.\n'
  '\n'
  'I had been walking home with a sick child on my mind and not enough for our family. Now there was money I '
  'could take back.\n'
  '\n'
  'For me, the prayer and finding the bill have never been separate. I had asked la Virgen del Carmen for '
  'help, and I believed she had heard me.\n'
  '\n'
  'I was going home to the same family, but no longer with only my worry.'),
 ('Why my faith was so strong',
  'When you asked what made my faith so strong, this was the story I wanted you to hear. I found that bill '
  'while asking la Virgen del Carmen de la Legua to help my family.\n'
  '\n'
  'She was real to me, as real as someone in the family. Someone I could turn toward when I was frightened. '
  'Someone whose help I believed I had known.\n'
  '\n'
  'I did not carry the money forever. I carried what finding it meant.\n'
  '\n'
  "That is where my faith lived: in our family's life, in a hard moment, and in the help I believed she had "
  'brought us.'),
 ('What I want you to remember',
  'You have heard our stories of hunger, illness, work, friendship, and the ways people protected one '
  'another. There was more than one setback, and more than one day when we had to find a way forward.\n'
  '\n'
  "Keep the people inside those stories. Your grandfather's effort. Your mother's innocence. The faith that "
  'helped me face what was ahead.\n'
  '\n'
  'We were not only the troubles that came to us. We were the family trying to care for one another through '
  'them.\n'
  '\n'
  'That is what I wanted to give you: the people we were, the love we had, and how we kept going.')]

PORT = [('Before the first load',
  'Tomás reached the gate with his lunch under one arm. He had a place on the crew, but he was still '
  'learning how to belong.\n'
  '\n'
  'Julián found him waiting and asked whether he had eaten. Tomás said yes. The older man glanced at the '
  'untouched bread in his hand, smiled, and waited while he took a bite.\n'
  '\n'
  'Tomás wanted to be useful. He wanted nobody to think he was slow. Julián seemed to recognize that '
  'feeling.\n'
  '\n'
  'Before they went in, he told Tomás there was no shame in asking someone to look twice.'),
 ('Learning the crew',
  'At first, Tomás noticed how quickly the others worked. Then he noticed how much they noticed.\n'
  '\n'
  'Someone knew whose shoulder was sore. Someone else realized a coworker was missing. A joke revealed that '
  'one man had spent the night caring for someone at home.\n'
  '\n'
  'Tomás had thought he would prove himself by needing very little. Around him, experienced workers still '
  'checked on one another.\n'
  '\n'
  'Julián moved closer to the tired man and asked Tomás to stay where they could see each other. There was '
  'no speech about kindness. Looking out for people was simply part of the work.'),
 ('A day that wanted to hurry',
  'The day began to run late. Conversations shortened, and everyone looked toward the next task before '
  'finishing the last. Tomás felt the familiar fear of not doing enough. He moved faster.\n'
  '\n'
  'Julián called him back. Nothing had gone wrong yet. There was only a young worker hurrying beyond the '
  'pace at which he could pay attention.\n'
  '\n'
  'Tomás flushed, but Julián kept his voice ordinary. They took the next part together.\n'
  '\n'
  "The delay remained. So did the pressure. But Tomás no longer had to pretend he wasn't feeling it, or "
  'carry it by himself.'),
 ('The shout',
  'Someone shouted for the work to stop. A coworker had fallen.\n'
  '\n'
  "The crew's attention changed direction. A moment earlier, everyone had been watching the task. Now they "
  'were looking for one another. They stopped and called for help.\n'
  '\n'
  'Tomás wanted to rush forward. Julián stayed beside him, keeping another frightened movement from adding '
  'to the confusion.\n'
  '\n'
  'There was no single heroic moment. Someone repeated a question. Someone made room for help. Nobody '
  "offered an answer they didn't have.\n"
  '\n'
  "What mattered was that the injured man wasn't alone, and finishing the job had stopped being the most "
  'important thing.'),
 ('What counted as work',
  'Tomás could feel the lost time gathering in the silence. He was ashamed to worry about wages while a '
  "coworker was hurt. Julián understood: people were waiting at home, and needing money didn't mean caring "
  'less.\n'
  '\n'
  'While help arrived, the crew found small jobs to do. Someone told the person who needed to know. Someone '
  "gathered the injured man's belongings.\n"
  '\n'
  'Tomás picked up the lunch left behind. Its ordinary wrapping caught him: this man had expected to eat, '
  'finish work, and go home.\n'
  '\n'
  "He held it carefully. For once, he didn't wonder whether his task looked important enough."),
 ('The call home',
  'When he was able, the injured worker asked to call his family. Someone helped him reach them. Tomás '
  'stayed nearby without trying to listen.\n'
  '\n'
  'He thought of people waiting for a familiar person to come home. Silence could make an ordinary delay '
  'frightening.\n'
  '\n'
  'After the call, the man looked less alone. Nobody knew everything that would follow, but his family knew '
  'where he was.\n'
  '\n'
  'Julián asked who could check in later. Two men answered; then Tomás offered too.\n'
  '\n'
  "He could make a call. He could ask what was needed. His responsibility didn't have to end at the gate."),
 ('Bread divided at the gate',
  'Julián handed Tomás his forgotten lunch. Before leaving, they sat with the crew. The day returned to '
  'things they could hold: water, bread, a phone number.\n'
  '\n'
  "Tomás admitted that he'd wanted nobody to think he was slow. Julián didn't laugh. He had once wanted that "
  "too. Letting someone look out for you, he said, didn't make you less of a worker.\n"
  '\n'
  'There was news of their coworker, a question about tomorrow, a tentative joke.\n'
  '\n'
  "Tomás divided his bread. It didn't turn the day into a good day. It gave them a way to sit together "
  'before going home.'),
 ('The story worth telling',
  'At home, Tomás began telling the story of the accident. Then he stopped and began again—with the crew.\n'
  '\n'
  'He spoke about Julián noticing his hurry, the shout that stopped the work, the lunch gathered up, the '
  'call home, the people who would check in later. There was no single hero. He preferred the story that '
  'way.\n'
  '\n'
  'Work was more than the weight of a load or the danger of a moment. It was knowing when another person '
  'needed someone beside them.\n'
  '\n'
  'Tomás had come home. Other people had helped make that possible. That was the story worth keeping.')]

CARE = [('The chair by the door',
  'Rosa arrived with a bag and an apology. She was late. Her brother Andrés stood from the chair by the door '
  'and said their mother was resting.\n'
  '\n'
  'He took the bag without counting how little food she had brought. Then he made room for her to sit.\n'
  '\n'
  'In their family, illness had changed ordinary days. Cancer was a word they now carried alongside work, '
  'travel, and the need to eat.\n'
  '\n'
  "Rosa didn't have to explain the whole difficult journey before resting. Someone had kept a chair for her. "
  'That small kindness was where this afternoon began.'),
 ('The things on the list',
  'Food. Travel. Time away from work. A call to return. The list asked more of the week than the week seemed '
  'able to give.\n'
  '\n'
  'Andrés had moved an item lower down. Rosa almost answered sharply, then saw his tired face. Neither '
  'needed the other to become an opponent because the list was difficult.\n'
  '\n'
  'They sat beside each other and went through it again. Some entries were questions; some would wait.\n'
  '\n'
  "The page didn't become easy. But it was no longer a list each was privately failing to complete. It was "
  'something they had looked at together.'),
 ('A meal that stretched',
  "Rosa warmed what she'd brought. Andrés found something in the cupboard, and a neighbor left food they "
  'could share. For that afternoon, nobody needed to pretend not to be hungry.\n'
  '\n'
  'Their mother asked whether Rosa had eaten. Even while ill, she noticed her daughter keeping busy instead '
  'of admitting she needed to stop.\n'
  '\n'
  'Rosa sat where her mother could see her and ate.\n'
  '\n'
  "The meal couldn't answer every need. It didn't have to. Plates went onto the table, and a place was made "
  "for the person who'd been serving. For a little while, care moved in more than one direction."),
 ('When patience ran out',
  'They argued over a missed call. Andrés thought Rosa had promised to make it; Rosa thought he had. Soon '
  'the argument carried everything else: lost time, missed work, fear.\n'
  '\n'
  'Rosa heard the sharpness in her own voice and wished she could retrieve a sentence. They went quiet.\n'
  '\n'
  "Eventually Andrés asked if they could talk about the call instead of everything at once. It wasn't an "
  'elegant apology, but it opened a way back.\n'
  '\n'
  'They made the call together. The harder conversation would take time. For now, they stopped treating one '
  'another as the cause of a burden neither had chosen.'),
 ('A different pair of hands',
  'Their cousin arrived and asked what would make the next few hours easier. Rosa immediately said they were '
  'managing, before checking whether it was true.\n'
  '\n'
  'Her cousin waited, then offered to stay while Rosa rested and Andrés ran an errand. They included their '
  'mother in the decision.\n'
  '\n'
  "Accepting help meant letting someone do things differently. It meant trusting that stepping away wasn't "
  'abandonment.\n'
  '\n'
  "But the house didn't fall apart when care changed hands. It became a little more possible to continue.\n"
  '\n'
  'Lying down, Rosa heard familiar voices in the next room. This time, she let them continue without her.'),
 ('The ordinary conversation',
  'Their mother wanted to talk about something besides being ill. She began a family story, and Rosa stopped '
  'watching the clock.\n'
  '\n'
  'Andrés corrected a detail. Their mother corrected his correction. All three smiled at a disagreement so '
  'familiar it felt like coming home.\n'
  '\n'
  "Illness hadn't become the whole person sitting there. She could still be impatient with a badly told "
  'story, remember things differently, and want an ordinary conversation.\n'
  '\n'
  "The uncertainty remained. It simply wasn't the only thing in the room.\n"
  '\n'
  'Later, Rosa wrote the story down, including the part her brother got wrong and how their mother set him '
  'straight.'),
 ('Another difficult morning',
  'An arrangement fell through. The house was short of something again. Rosa felt the old fear: did every '
  'setback mean beginning from nothing?\n'
  '\n'
  "Then she looked at the list. There were names beside it now, not only hers and Andrés's. There were "
  "people to call and things they'd learned to ask for before becoming exhausted.\n"
  '\n'
  "They weren't protected from every hard day. They were less alone inside those days.\n"
  '\n'
  'Sometimes Rosa still needed to cry before making the next call. Sometimes Andrés needed someone else to '
  'take the first turn. The family made room for that too, and kept trying.'),
 ('The people who returned',
  'Someone arrived at the door with food and asked what the next few hours required. This time, they stayed '
  'long enough to hear the answer.\n'
  '\n'
  "The family's uncertainty hadn't disappeared. What had changed was how many people were willing to share "
  'its weight.\n'
  '\n'
  "Rosa looked at the chair by the door. The same person didn't always occupy it. Someone could stand up "
  'because someone else had come.\n'
  '\n'
  "There would be another day to meet, and perhaps another setback. They didn't know everything it would ask "
  'of them. When it arrived, they would try to meet it together.')]

def build():
    specs=[
        ('bread','El pan que pudo traer','The bread he brought home','RECOLLECTIONS WOVEN TOGETHER',
         'A father’s work, a four-year-old’s innocent request, and a grandmother’s prayer on the way home.', BREAD, 'lily',
         'Grandma’s first-person telling, reconstructed from recollections preserved by her grandchild. The wording is a literary adaptation, not a verbatim transcript or her recorded voice. At the family’s request, the bread and found-banknote memories are woven together; the sequence is not a verified single-day chronology. The sick child is not identified and no medical outcome is invented. Her grandchild’s separate perspective appears in a family note, outside her narration.',
         'Grandma and our family in Lima', 'Grandma',
         ['Adult Latin American dockworker finishing a shift, viewed with dignity beside cargo and coworkers. No particular named port, company, decade, or recognizable person.', 'Modest urban family interior in Lima, an adult father returning with a bag of bread, a four-year-old girl greeting him warmly. Dignity, tenderness, no spectacle of poverty. No text, logos, specific bread type, or recognizable real people.', 'An adult woman walking home on an ordinary urban Lima street notices a banknote on the pavement. Quiet, grounded moment. No readable denomination, no apparition, no supernatural figure, no visible sick child.']),
        ('port','Las manos que se cuidaban','The hands that looked out for each other','FICTION INSPIRED BY FAMILY THEMES',
         'An imagined crew of stevedores discovers that looking out for one another is part of the work.', PORT, 'george',
         'Inspired fiction. Tomás, Julián, this crew, and this accident are invented. This is not a claim about an incident involving the grandfather. It is inspired by a grandchild’s recollection of his stories about stevedoring, friends, accidents, and mutual protection. The port is deliberately unnamed.',
         'An imagined crew of stevedores', 'Keeper · fiction inspired by a grandchild’s recollection',
         ['An adult crew of stevedores arriving for work at an unnamed Latin American port, quiet dawn, ordinary work clothes, companionship, no company logos or specific dated machinery.', 'Adult dockworkers together after work has stopped, concern and mutual support, one man seated comfortably among coworkers, no visible injuries or graphic detail, no hazardous action demonstrated.', 'A group of adult dockworkers sharing bread and water near a port gate after a long day, equal dignity, subtle humor and fatigue, no heroic posing.']),
        ('care','La familia que seguía volviendo','The family who kept showing up','FICTION INSPIRED BY FAMILY THEMES',
         'A family in Lima learns to share the work of caring through illness, hunger, and an uncertain week.', CARE, 'sarah',
         'Inspired fiction. Rosa, Andrés, their mother, and the events of this week are invented; no diagnosis is attributed to an identifiable member of the user’s family. The story draws on shared themes of cancer, hunger, mutual care, and resilience, without inventing a medical outcome.',
         'An imagined family in Lima', 'Keeper · fiction inspired by family recollections',
         ['A quiet urban Lima home, an adult woman arriving with a bag while her adult brother offers her a chair, an older adult woman resting nearby, warm humanity, no hospital equipment or medical imagery.', 'Adult siblings in a modest Lima kitchen preparing a meal together, a few everyday plates, a handwritten list without legible words, shared effort, dignity rather than poverty spectacle.', 'An ordinary family doorway in Lima with an empty wooden chair and a relative arriving with food, gentle late afternoon light, no celebratory cure symbolism, no identifiable people.'])
    ]
    collection={'title':'Las historias que nos hicieron','books':[]}
    for slug,title,subtitle,label,description,chapters,voice,notice,subject,narrator,art in specs:
        target=OUT/slug;target.mkdir(parents=True,exist_ok=True)
        quotes = (["He was a stevedore in Latinamerica.", "he came home with some bread", "She asked for butter", "he left crying because he couldn't afford it", "my grandma prayed to the virgen del carmen de la legua in callao", "she found a large bill that saved them", "as real as any person in the family", "Those stories formed me."] if slug=='bread' else (["He was a stevedore in Latinamerica."]*7+["how people protect each other."] if slug=='port' else ["stories about family sickness, hunger"]*7+["Family overcame everything, even after so many setbacks."]))
        pages=[]
        for i,(heading,text) in enumerate(chapters):
            art_index=([0,1,1,1,2,2,2,1] if slug=='bread' else [0,0,0,1,1,1,2,2] if slug=='port' else [0,1,1,0,2,0,1,2])[i]
            pages.append({'title':heading,'text':text,'quote':quotes[i], 'adaptation':notice if slug!='bread' else ['The opening reflects on the supplied work history; the end-of-shift transition is imagined.','The bread, the child’s age, and her thanks were supplied. Scene framing is literary.','The child’s age, thanks, and request for butter were supplied and clarified by the grandchild. Her innocence is preserved; reflective framing is literary.','The father leaving in tears because he could not afford the request was supplied; the reflective passages are editorial.','The walk, sick child, lack of food, and prayer to la Virgen del Carmen de la Legua in Callao were supplied. Linking this walk after the bread scene is a family-requested literary sequence.','The large bill and its importance were supplied. No value, donor, medical diagnosis, or cure has been invented.','Grandma’s conviction and experience are retold from her perspective. Her grandchild’s different interpretation is preserved separately, not put into her mouth.','This closing reflects on the supplied family recollections and their influence. It does not invent later wealth, a cure, or a new family event.'][i],
             'illustration':art[art_index], 'image':f'stories/lima/{slug}/scene-{art_index+1}.webp'})
        book={'id':f'lima-{slug}','curated':True,'source':'curated','style':'imaginative' if slug!='bread' else 'faithful','title':title,'subtitle':subtitle,'defaultVoice':'rachel','defaultVoices':{'Original':'rachel','English':'rachel','Spanish':'tina'},'reviewed':False,
              'provenance':{'label':label,'kind':'woven-recollections' if slug=='bread' else 'inspired-fiction'},'notice':notice,
              'memory':{'name':subject,'narrator':narrator,'perspective':'remembered','text':SOURCE,'dedication':'For the family who carried us · Lima, Perú','style':'faithful' if slug=='bread' else 'imaginative','tone':'match','page_count':8},
              'pages':pages,'question':'Which story do you want the next generation to carry?','translations':{},'art_prompts':art}
        if slug=='bread':
            book['memory'].update(narrator='Grandma', source_provider='her grandchild', narrative_voice='storyteller', chapter_length='concise')
            book['provenance']['label']='GRANDMA’S TELLING · FAMILY RECONSTRUCTION'
            for page in book['pages']:
                page['adaptation']='First-person reconstruction of Grandma’s telling, not a verbatim transcript. '+page['adaptation']
            book['family_note']={'author':'Her grandchild', 'text':'To me it was just a coincidence, some random bill she found, but to my grandma it was a defining moment that made the virgin mary as real as any person in the family'}
        chapter_art=json.loads((target/'chapter-art.json').read_text())
        assert len(chapter_art)==len(book['pages'])==8, slug
        for page,item in zip(book['pages'],chapter_art):
            page['image']=item['image'];page['illustration']=item['scene']
        book['collection_slug']=slug
        book['memory']['chapter_length']='concise'
        book['art_generation']='bundled-imagegen'
        book['art_prompts']=[item['scene'] for item in chapter_art]
        book['visual_revision']='chapter-scenes-carmen-v2' if slug=='bread' else 'companion-chapter-scenes-v1'
        if slug=='bread':
            book['devotion']={'name':'Virgen del Carmen de la Legua','place':'Callao, Perú','reference':'https://www.diocesisdelcallao.org/advocaciones/virgen-del-carmen-de-la-legua'}
        assert all(p['quote'] in SOURCE for p in pages),slug
        (target/'book.json').write_text(json.dumps(book,ensure_ascii=False,indent=2))
        collection['books'].append({'slug':slug,'title':title,'subtitle':subtitle,'label':book['provenance']['label'],'description':description,'cover':book['pages'][1]['image'] if slug=='bread' else f'stories/lima/{slug}/scene-1.webp','alt':f'Illustration for {title}; not a photograph of the family','path':f'stories/lima/{slug}/book.json'})
        print(slug,len(pages),'chapters',sum(len(p['text'].split()) for p in pages),'words')
    (OUT/'collection.json').write_text(json.dumps(collection,ensure_ascii=False,indent=2))


if __name__=='__main__':
    build()
