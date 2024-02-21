import { Bubble, GiftedChat, InputToolbar } from 'react-native-gifted-chat';
import { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Chat = ({ route, navigation, db, isConnected }) => {
  const { userID, name, backgroundColor } = route.params;
  const [messages, setMessages] = useState([]);

  // Adds new message to database
  const onSend = (newMessages) => {
    addDoc(collection(db, 'messages'), newMessages[0]);
  }

  useEffect(() => {
    navigation.setOptions({ title: name });
    let unsubMessages;

    // Check if online
    if (isConnected === true) {
      // Unregister current onSnapshot() if present
      if (unsubMessages) unsubMessages();
      unsubMessages = null;

      // query database to get messages in order by time sent
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      // Creates snapshot of messages list to render into view
      unsubMessages = onSnapshot(q, (documentsSnapshot) => {
        let newMessages = [];
        documentsSnapshot.forEach(doc => {
          newMessages.push({
            id: doc.id,
            ...doc.data(),
            createdAt: new Date(doc.data().createdAt.toMillis())
          })
        });
        // caches messages
        cacheMessages(newMessages);
        // sets screenshot in messages state
        setMessages(newMessages);
      });
      // if offline loads chached messages
    } else loadCachedMessages();

    //Clean up code
    return () => {
      if (unsubMessages) unsubMessages();
    }

    // Checks if isConnected changes. If true runs use effect function.
  }, [isConnected]);


  // Retrieves cached messages from storage and parses
  const loadCachedMessages = async () => {
    const cachedMessages = await AsyncStorage.getItem("chat_messages") || [];
    setMessages(JSON.parse(cachedMessages));
  }

  // Stores messages from database when online in AsyncStorage
  const cacheMessages = async (messagesToCache) => {
    try {
      await AsyncStorage.setItem("chat_messages", JSON.stringify(messagesToCache));
    } catch (error) {
      console.log(error.message);
    }
  }

  // Change style of message bubble
  const renderBubble = (props) => {
    return <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: '#000'
        },
        left: {
          backgroundColor: '#fff'
        }
      }}
    />
  }

  // Hide input toolbar when offline
  const renderInputToolbar = (props) => {
    if (isConnected) {
      return <InputToolbar {...props} />;
    } else return null;
  }


  return (
    <View style={[styles.container, { backgroundColor: backgroundColor }]}>
      <GiftedChat
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: userID,
          name: name
        }}
      />
      {Platform.OS === 'androud' ? <KeyboardAvoidingView behavior='height' /> : null}
      {Platform.OS === 'ios' ? <KeyboardAvoidingView behavior='padding' /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default Chat;