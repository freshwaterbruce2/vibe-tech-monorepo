import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Lock, MessageCircle, Sparkles, Star } from 'lucide-react';
import {
  buildTutorReply,
  calculateFocusMinutes,
  calculateTokenBalance,
  type HomeworkTask,
  type LessonCard,
  starterLessons,
  type TutorMessage,
  type TutorPlan,
} from './domain/tutoring';
import { loadPlan, loadTasks, savePlan, saveTasks } from './services/mobileStorage';
import {
  activateMobilePass,
  canUseFeature,
  evaluateMobilePlan,
  VIBE_TUTOR_FEATURES,
} from './services/mobileEntitlements';

const demoUser = {
  id: 'mobile-demo-learner',
  email: 'learner@vibetutor.test',
  fullName: 'Vibe Tutor Learner',
};

export function App() {
  const [plan, setPlan] = useState<TutorPlan>(() => loadPlan());
  const [tasks, setTasks] = useState<HomeworkTask[]>(() => loadTasks());
  const [activeLesson, setActiveLesson] = useState<LessonCard>(starterLessons[0]);
  const [chatInput, setChatInput] = useState('');
  const [licenseKey, setLicenseKey] = useState('DEMO-PLUS');
  const [billingStatus, setBillingStatus] = useState('Ready for closed testing');
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'tutor',
      text: 'Pick a lesson or homework task. I will coach one step at a time.',
    },
  ]);

  const premiumUnlocked = canUseFeature(plan, VIBE_TUTOR_FEATURES.premiumLessons);
  const entitlementSummary = useMemo(() => evaluateMobilePlan(plan), [plan]);
  const completedMinutes = calculateFocusMinutes(tasks);
  const tokenBalance = calculateTokenBalance(tasks);

  const updateTasks = (nextTasks: HomeworkTask[]) => {
    setTasks(nextTasks);
    saveTasks(nextTasks);
  };

  const toggleTask = (taskId: string) => {
    updateTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const startLesson = (lesson: LessonCard) => {
    if (lesson.premium && !premiumUnlocked) {
      setBillingStatus('Upgrade required for premium tutor sessions.');
      return;
    }

    setActiveLesson(lesson);
    setMessages((current) => [
      ...current,
      {
        id: `lesson-${lesson.id}-${Date.now()}`,
        role: 'tutor',
        text: buildTutorReply(lesson.subject, lesson),
      },
    ]);
  };

  const sendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `student-${Date.now()}`, role: 'student', text: trimmed },
      {
        id: `tutor-${Date.now()}`,
        role: 'tutor',
        text: buildTutorReply(trimmed, activeLesson),
      },
    ]);
    setChatInput('');
  };

  const activatePass = async () => {
    try {
      const nextPlan = await activateMobilePass(licenseKey, {
        user: demoUser,
        plan,
        deviceName: 'Android closed-testing device',
      });
      setPlan(nextPlan);
      savePlan(nextPlan);
      setBillingStatus(`Activated ${nextPlan} tutoring access.`);
    } catch (error) {
      setBillingStatus(error instanceof Error ? error.message : 'Unable to activate billing pass.');
    }
  };

  return (
    <main className="appShell">
      <section className="heroPanel" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Google Play closed testing build</p>
          <h1 id="app-title">Vibe Tutor Mobile</h1>
          <p className="heroCopy">
            Homework coaching, focus planning, rewards, and premium tutoring adapted for thumbs,
            portrait screens, and offline-first Android sessions.
          </p>
        </div>
        <div className="planBadge" aria-label={`Current plan ${plan}`}>
          <Sparkles size={18} />
          {plan}
        </div>
      </section>

      <section className="statsGrid" aria-label="Learner progress">
        <article>
          <span>{completedMinutes}</span>
          focus minutes
        </article>
        <article>
          <span>{tokenBalance}</span>
          VibeBux
        </article>
        <article>
          <span>{premiumUnlocked ? 'On' : 'Off'}</span>
          premium tutor
        </article>
      </section>

      <section className="mobileCard">
        <div className="sectionHeader">
          <BookOpen size={20} />
          <h2>Touch tutoring path</h2>
        </div>
        <div className="lessonList">
          {starterLessons.map((lesson) => {
            const locked = lesson.premium && !premiumUnlocked;
            return (
              <button
                className={lesson.id === activeLesson.id ? 'lesson active' : 'lesson'}
                key={lesson.id}
                onClick={() => startLesson(lesson)}
                type="button"
              >
                <span>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.subject} / {lesson.minutes} min</small>
                </span>
                {locked ? <Lock size={18} /> : <Star size={18} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mobileCard">
        <div className="sectionHeader">
          <CheckCircle2 size={20} />
          <h2>Homework queue</h2>
        </div>
        <div className="taskList">
          {tasks.map((task) => (
            <button
              className={task.completed ? 'task complete' : 'task'}
              key={task.id}
              onClick={() => toggleTask(task.id)}
              type="button"
            >
              <span>
                <strong>{task.title}</strong>
                <small>{task.subject} / {task.minutes} min</small>
              </span>
              <span className="check">{task.completed ? 'Done' : 'Tap done'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mobileCard chatCard">
        <div className="sectionHeader">
          <MessageCircle size={20} />
          <h2>Step-by-step coach</h2>
        </div>
        <div className="messages" aria-live="polite">
          {messages.slice(-5).map((message) => (
            <p className={message.role} key={message.id}>
              {message.text}
            </p>
          ))}
        </div>
        <div className="chatComposer">
          <input
            aria-label="Ask Vibe Tutor"
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage();
              }
            }}
            placeholder="Ask for one hint..."
            value={chatInput}
          />
          <button onClick={sendMessage} type="button">Send</button>
        </div>
      </section>

      <section className="mobileCard billingCard">
        <div>
          <h2>Mobile monetization</h2>
          <p>
            Premium lessons and unlimited tutor chat are entitlement-gated through the shared
            VibeTech billing packages.
          </p>
          <p className="status">{billingStatus}</p>
        </div>
        <div className="billingControls">
          <input
            aria-label="License key"
            onChange={(event) => setLicenseKey(event.target.value)}
            value={licenseKey}
          />
          <button onClick={activatePass} type="button">Activate</button>
        </div>
        <dl className="entitlementList">
          {Object.values(VIBE_TUTOR_FEATURES).map((feature) => (
            <div key={feature}>
              <dt>{feature}</dt>
              <dd>{entitlementSummary[feature]?.enabled ? 'enabled' : 'locked'}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
