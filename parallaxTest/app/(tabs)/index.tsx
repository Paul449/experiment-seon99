import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Parallax } from 'react-next-parallax';
import {Image} from 'react-native';

export default function HomeScreen() {
  return(
    <Parallax>
      <ThemedView className='relative w-[800px] h-[600px] [&>img]:absolute [&>img]:inset-0'>
        <Image src='@/assets/images/HaircutImage0.png' data-parallax-offset = "-5"></Image>
      </ThemedView>
    </Parallax>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
});
