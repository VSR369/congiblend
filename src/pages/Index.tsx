import { motion } from 'framer-motion';
import { ContentFeed } from '@/components/ui/content-feed';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
              Your Professional Network
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect, share, and engage with a sophisticated content feed designed for modern professionals.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Feed */}
      <section className="pb-20 px-4">
        <ContentFeed />
      </section>
    </div>
  );
};

export default Index;
