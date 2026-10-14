import React from 'react';
import { HeroInput, HeroInputProps } from '../components/youtube/HeroInput';

export interface HomePageProps extends HeroInputProps {}

export const HomePage: React.FC<HomePageProps> = (props) => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <HeroInput {...props} />
    </main>
  );
};

export default HomePage;
