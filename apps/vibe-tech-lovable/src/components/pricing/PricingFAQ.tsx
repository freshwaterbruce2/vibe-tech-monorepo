
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What does the monthly pricing cover?",
    answer: "The monthly plans cover ongoing marketing-hub updates: product positioning, page updates, quote-flow improvements, launch messaging, route checks, and buyer-path refinements for the apps being promoted on Vibe-Tech.org."
  },
  {
    question: "Can this market more than one app?",
    answer: "Yes. The site is being positioned as the front door for the full Vibe-Tech project suite, including Vibe Tutor, Chessmaster Academy, Proposal Review, Clinic Autopilot, Invoice Automation, and future generated products."
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes. Plans can scale from a single launch page to a multi-product catalog as more apps move from prototype to paid offer."
  },
  {
    question: "Does this include deployment and domain work?",
    answer: "The higher plans include deployment readiness support and coordination guidance. Production DNS or Vercel alias changes are handled as explicit release steps after the app build is verified."
  },
  {
    question: "What if a product still needs checkout or backend work?",
    answer: "That work can be scoped separately. The marketing hub can still present the offer, capture leads, and make the next engineering gate clear while the product runtime is finished."
  }
];

const PricingFAQ = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-aura-accent to-aura-accentSecondary bg-clip-text text-transparent">
        Frequently Asked Questions
      </h2>
      
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="bg-aura-backgroundLight rounded-lg mb-4 px-6 border border-aura-accent/10 overflow-hidden"
          >
            <AccordionTrigger className="py-5 text-left text-lg font-medium hover:no-underline text-white">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-white pb-5">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      <div className="mt-12 text-center">
        <p className="text-white">
          Still have questions? <a href="/contact" className="text-aura-accent hover:underline">Contact our team</a> for more information.
        </p>
      </div>
    </motion.div>
  );
};

export default PricingFAQ;
