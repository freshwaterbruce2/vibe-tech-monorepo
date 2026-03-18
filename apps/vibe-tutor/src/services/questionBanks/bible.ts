/**
 * Bible Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const BIBLE_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'bible-b-1', subject: 'Bible', difficulty: 'Beginner', question: 'Who built the ark?', correctAnswer: 'Noah', type: 'fill-blank' },
    { id: 'bible-b-2', subject: 'Bible', difficulty: 'Beginner', question: 'God created the world in how many days?', correctAnswer: '6', type: 'fill-blank' },
    { id: 'bible-b-3', subject: 'Bible', difficulty: 'Beginner', question: 'Who was the first man created?', correctAnswer: 'Adam', type: 'fill-blank' },
    { id: 'bible-b-4', subject: 'Bible', difficulty: 'Beginner', question: 'Where was Jesus born?', correctAnswer: 1, options: ['Jerusalem', 'Bethlehem', 'Nazareth', 'Rome'], type: 'multiple-choice' },
    { id: 'bible-b-5', subject: 'Bible', difficulty: 'Beginner', question: 'How many commandments did God give to Moses?', correctAnswer: '10', type: 'fill-blank' },
    { id: 'bible-b-6', subject: 'Bible', difficulty: 'Beginner', question: 'Who swallowed Jonah?', correctAnswer: 2, options: ['A shark', 'A lion', 'A large fish', 'A crocodile'], type: 'multiple-choice' },
    { id: 'bible-b-7', subject: 'Bible', difficulty: 'Beginner', question: 'Who is the mother of Jesus?', correctAnswer: 'Mary', type: 'fill-blank' },
    { id: 'bible-b-8', subject: 'Bible', difficulty: 'Beginner', question: 'What did David use to defeat Goliath?', correctAnswer: 0, options: ['A sling and a stone', 'A sword', 'A spear', 'A bow and arrow'], type: 'multiple-choice' },
    { id: 'bible-b-9', subject: 'Bible', difficulty: 'Beginner', question: 'True or False: Jesus had 12 main disciples.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'bible-b-10', subject: 'Bible', difficulty: 'Beginner', question: 'What is the first book of the Bible?', correctAnswer: 'Genesis', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'bible-i-1', subject: 'Bible', difficulty: 'Intermediate', question: 'Who defeated Goliath?', correctAnswer: 'David', type: 'fill-blank' },
    { id: 'bible-i-2', subject: 'Bible', difficulty: 'Intermediate', question: 'Who was swallowed by a large fish after running from God?', correctAnswer: 'Jonah', type: 'fill-blank' },
    { id: 'bible-i-3', subject: 'Bible', difficulty: 'Intermediate', question: 'What was the sign of God\'s promise to never flood the earth again?', correctAnswer: 'rainbow', type: 'fill-blank' },
    { id: 'bible-i-4', subject: 'Bible', difficulty: 'Intermediate', question: 'Who parted the Red Sea?', correctAnswer: 3, options: ['Joshua', 'Aaron', 'Abraham', 'Moses'], type: 'multiple-choice' },
    { id: 'bible-i-5', subject: 'Bible', difficulty: 'Intermediate', question: 'Which disciple betrayed Jesus?', correctAnswer: 'Judas', type: 'fill-blank' },
    { id: 'bible-i-6', subject: 'Bible', difficulty: 'Intermediate', question: 'On which mountain did Moses receive the Ten Commandments?', correctAnswer: 1, options: ['Mount Ararat', 'Mount Sinai', 'Mount of Olives', 'Mount Nebo'], type: 'multiple-choice' },
    { id: 'bible-i-7', subject: 'Bible', difficulty: 'Intermediate', question: 'Who was cast into the lions\' den?', correctAnswer: 'Daniel', type: 'fill-blank' },
    { id: 'bible-i-8', subject: 'Bible', difficulty: 'Intermediate', question: 'What city were the Israelites enslaved in?', correctAnswer: 'Egypt', type: 'fill-blank' },
    { id: 'bible-i-9', subject: 'Bible', difficulty: 'Intermediate', question: 'Who led the Israelites into the Promised Land after Moses died?', correctAnswer: 'Joshua', type: 'fill-blank' },
    { id: 'bible-i-10', subject: 'Bible', difficulty: 'Intermediate', question: 'Which Gospel is NOT a "synoptic" Gospel?', correctAnswer: 2, options: ['Matthew', 'Mark', 'John', 'Luke'], type: 'multiple-choice' },
  ],
  Advanced: [
    { id: 'bible-a-1', subject: 'Bible', difficulty: 'Advanced', question: 'The Ten Commandments were given to ___.', correctAnswer: 'Moses', type: 'fill-blank' },
    { id: 'bible-a-2', subject: 'Bible', difficulty: 'Advanced', question: 'What was a tax collector related to Jesus named?', correctAnswer: 0, options: ['Zacchaeus', 'Nicodemus', 'Barnabas', 'Silas'], type: 'multiple-choice' },
    { id: 'bible-a-3', subject: 'Bible', difficulty: 'Advanced', question: 'Who was the first king of Israel?', correctAnswer: 'Saul', type: 'fill-blank' },
    { id: 'bible-a-4', subject: 'Bible', difficulty: 'Advanced', question: 'What language was the Old Testament originally written in?', correctAnswer: 'Hebrew', type: 'fill-blank' },
    { id: 'bible-a-5', subject: 'Bible', difficulty: 'Advanced', question: 'What language was the New Testament originally written in?', correctAnswer: 1, options: ['Latin', 'Greek', 'Aramaic', 'Hebrew'], type: 'multiple-choice' },
    { id: 'bible-a-6', subject: 'Bible', difficulty: 'Advanced', question: 'Who wrote the majority of the Epistles (letters) in the New Testament?', correctAnswer: 'Paul', type: 'fill-blank' },
    { id: 'bible-a-7', subject: 'Bible', difficulty: 'Advanced', question: 'Which prophet challenged the prophets of Baal on Mount Carmel?', correctAnswer: 'Elijah', type: 'fill-blank' },
    { id: 'bible-a-8', subject: 'Bible', difficulty: 'Advanced', question: 'What is the longest book in the Bible?', correctAnswer: 2, options: ['Isaiah', 'Jeremiah', 'Psalms', 'Genesis'], type: 'multiple-choice' },
    { id: 'bible-a-9', subject: 'Bible', difficulty: 'Advanced', question: 'Who was the father of John the Baptist?', correctAnswer: 'Zechariah', type: 'fill-blank' },
    { id: 'bible-a-10', subject: 'Bible', difficulty: 'Advanced', question: 'To whom did Jesus say, "I will give you the keys of the kingdom of heaven"?', correctAnswer: 'Peter', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'bible-e-1', subject: 'Bible', difficulty: 'Expert', question: 'Which is NOT one of the 4 Gospels?', correctAnswer: 3, options: ['Matthew', 'Mark', 'Luke', 'Acts'], type: 'multiple-choice' },
    { id: 'bible-e-2', subject: 'Bible', difficulty: 'Expert', question: 'How many books are in the Protestant Bible?', correctAnswer: 2, options: ['60', '63', '66', '73'], type: 'multiple-choice' },
    { id: 'bible-e-3', subject: 'Bible', difficulty: 'Expert', question: 'Who was the Babylonian king that threw Shadrach, Meshach, and Abednego into the fire?', correctAnswer: 'Nebuchadnezzar', type: 'fill-blank' },
    { id: 'bible-e-4', subject: 'Bible', difficulty: 'Expert', question: 'Which group was known for their strict adherence to the law in Jesus\' time?', correctAnswer: 0, options: ['Pharisees', 'Sadducees', 'Essenes', 'Zealots'], type: 'multiple-choice' },
    { id: 'bible-e-5', subject: 'Bible', difficulty: 'Expert', question: 'At what event did the Holy Spirit descend upon the apostles like tongues of fire?', correctAnswer: 'Pentecost', type: 'fill-blank' },
    { id: 'bible-e-6', subject: 'Bible', difficulty: 'Expert', question: 'Who replaced Judas Iscariot as the 12th apostle?', correctAnswer: 'Matthias', type: 'fill-blank' },
    { id: 'bible-e-7', subject: 'Bible', difficulty: 'Expert', question: 'What was the Apostle Paul\'s name before his conversion?', correctAnswer: 'Saul', type: 'fill-blank' },
    { id: 'bible-e-8', subject: 'Bible', difficulty: 'Expert', question: 'Which minor prophet was commanded to marry an unfaithful wife?', correctAnswer: 1, options: ['Amos', 'Hosea', 'Micah', 'Malachi'], type: 'multiple-choice' },
    { id: 'bible-e-9', subject: 'Bible', difficulty: 'Expert', question: 'In the Book of Revelation, the number 666 is the mark of the ___.', correctAnswer: 'beast', type: 'fill-blank' },
    { id: 'bible-e-10', subject: 'Bible', difficulty: 'Expert', question: 'Which council in 325 AD established a unified Christian doctrine?', correctAnswer: 0, options: ['Council of Nicaea', 'Council of Trent', 'Council of Chalcedon', 'Council of Ephesus'], type: 'multiple-choice' },
  ],
  Master: [
    { id: 'bible-m-1', subject: 'Bible', difficulty: 'Master', question: 'The Beatitudes come from Jesus\' Sermon on the ___.', correctAnswer: 'Mount', type: 'fill-blank' },
    { id: 'bible-m-2', subject: 'Bible', difficulty: 'Master', question: 'Which heresy did the Council of Nicaea primarily address?', correctAnswer: 1, options: ['Gnosticism', 'Arianism', 'Pelagianism', 'Docetism'], type: 'multiple-choice' },
    { id: 'bible-m-3', subject: 'Bible', difficulty: 'Master', question: 'Who was the Syrian commander healed of leprosy by Elisha?', correctAnswer: 'Naaman', type: 'fill-blank' },
    { id: 'bible-m-4', subject: 'Bible', difficulty: 'Master', question: 'To which church did Paul write about the "fruit of the Spirit"?', correctAnswer: 'Galatians', type: 'fill-blank' },
    { id: 'bible-m-5', subject: 'Bible', difficulty: 'Master', question: 'What is the theological term for the study of the end times?', correctAnswer: 2, options: ['Soteriology', 'Ecclesiology', 'Eschatology', 'Christology'], type: 'multiple-choice' },
    { id: 'bible-m-6', subject: 'Bible', difficulty: 'Master', question: 'Which Roman Emperor issued the Edict of Milan, legalizing Christianity?', correctAnswer: 'Constantine', type: 'fill-blank' },
    { id: 'bible-m-7', subject: 'Bible', difficulty: 'Master', question: 'The Septuagint is a Greek translation of the ___ Testament.', correctAnswer: 'Old', type: 'fill-blank' },
    { id: 'bible-m-8', subject: 'Bible', difficulty: 'Master', question: 'Who was the high priest during the trial of Jesus?', correctAnswer: 0, options: ['Caiaphas', 'Annas', 'Pilate', 'Herod'], type: 'multiple-choice' },
    { id: 'bible-m-9', subject: 'Bible', difficulty: 'Master', question: 'What was the overarching theme of the Book of Ecclesiastes?', correctAnswer: 'meaninglessness', type: 'fill-blank' },
    { id: 'bible-m-10', subject: 'Bible', difficulty: 'Master', question: 'In Ezekiel\'s vision, what brought the dry bones to life?', correctAnswer: 3, options: ['Rain', 'Sunlight', 'Angels', 'Breath of God'], type: 'multiple-choice' },
  ],
} as const;
