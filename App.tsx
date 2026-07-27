import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

type Habit = { id: string; name: string; icon: string; target: number; unit: string; color: string; createdAt: string };
type DayLog = Record<string, number>;
type Logs = Record<string, DayLog>;

const COLORS = ['#F8B88B', '#EFAE7B', '#D99A7E', '#A9BFA8', '#B6A4C9', '#E5BB6A'];
const ICONS = ['💧', '🏃', '📚', '🧘', '🥗', '🌱', '💊', '✍️', '🎸', '😴', '☀️', '🧹'];
const STORAGE_KEY = '@sunny-habits/v1';
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const friendlyDate = () => new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const displayUnit = (habit: Habit) => habit.unit.trim() || 'steps';

const seedHabits: Habit[] = [
  { id: 'water', name: 'Drink water', icon: '💧', target: 4, unit: 'glasses', color: '#79B9CD', createdAt: '2020-01-01' },
  { id: 'read', name: 'Read a little', icon: '📚', target: 1, unit: 'session', color: '#E8B45C', createdAt: '2020-01-01' },
  { id: 'move', name: 'Move my body', icon: '🏃', target: 1, unit: 'session', color: '#E89B81', createdAt: '2020-01-01' },
];

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(seedHabits);
  const [logs, setLogs] = useState<Logs>({});
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        const data = JSON.parse(saved);
        // Older installs stored no unit. Keep those habits usable without losing any data.
        setHabits((data.habits || seedHabits).map((habit: Habit) => ({ ...habit, unit: habit.unit || 'steps' })));
        setLogs(data.logs || {});
      }
    }).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, logs })); }, [habits, logs, ready]);

  const updateCount = (habit: Habit, change: number) => {
    const key = todayKey();
    setLogs((old) => ({ ...old, [key]: { ...old[key], [habit.id]: Math.max(0, (old[key]?.[habit.id] || 0) + change) } }));
  };
  const completedToday = habits.filter((h) => (logs[todayKey()]?.[h.id] || 0) >= h.target).length;

  return (
    <SafeAreaView style={styles.safe}><StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR DAILY RHYTHM</Text><Text style={styles.title}>Good morning ☀️</Text><Text style={styles.date}>{friendlyDate()}</Text></View><View style={styles.sun}><Text style={{ fontSize: 25 }}>✦</Text></View></View>
        <View style={styles.summary}><Text style={styles.summaryCount}>{completedToday} of {habits.length}</Text><Text style={styles.summaryText}>habits complete today</Text><View style={styles.track}><View style={[styles.fill, { width: `${habits.length ? completedToday / habits.length * 100 : 0}%` }]} /></View></View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Today’s habits</Text><Pressable onPress={() => setEditing({ id: '', name: '', icon: '🌱', target: 1, unit: 'steps', color: COLORS[0], createdAt: todayKey() })}><Text style={styles.addText}>+ Add habit</Text></Pressable></View>
        <FlatList data={habits} keyExtractor={(h) => h.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <HabitCard habit={item} count={logs[todayKey()]?.[item.id] || 0} onIncrement={() => updateCount(item, 1)} onDecrement={() => updateCount(item, -1)} onOpen={() => setDetail(item)} />} />
      </View>
      <HabitEditor habit={editing} onClose={() => setEditing(null)} onSave={(habit) => { setHabits((old) => habit.id ? old.map((h) => h.id === habit.id ? habit : h) : [...old, { ...habit, id: Date.now().toString() }]); setEditing(null); }} onDelete={(id) => { setHabits((old) => old.filter((h) => h.id !== id)); setEditing(null); }} />
      <HabitDetail habit={detail} logs={logs} onClose={() => setDetail(null)} onEdit={() => { setDetail(null); setEditing(detail); }} />
    </SafeAreaView>
  );
}

function HabitCard({ habit, count, onIncrement, onDecrement, onOpen }: { habit: Habit; count: number; onIncrement: () => void; onDecrement: () => void; onOpen: () => void }) {
  const done = count >= habit.target;
  const unit = displayUnit(habit);
  const progress = Math.min(100, count / habit.target * 100);
  return <View style={styles.card}><Pressable style={styles.cardMain} onPress={onOpen}><View style={[styles.icon, { backgroundColor: habit.color }]}><Text style={styles.iconText}>{habit.icon}</Text></View><View style={styles.cardCopy}><Text style={[styles.habitName, done && styles.doneText]}>{habit.name}</Text><Text style={styles.habitSub}>{habit.target === 1 ? (done ? `Done · ${count} ${unit}` : `Goal: ${habit.target} ${unit}`) : `${count} of ${habit.target} ${unit}`}</Text>{habit.target > 1 && <View style={styles.miniTrack}><View style={[styles.miniFill, { backgroundColor: habit.color, width: `${progress}%` }]} /></View>}</View></Pressable>
    {habit.target === 1 ? <Pressable onPress={onIncrement} style={[styles.check, done && { backgroundColor: habit.color, borderColor: habit.color }]}><Text style={styles.checkMark}>{done ? '✓' : ''}</Text></Pressable> : <View style={styles.stepper}><Pressable onPress={onDecrement} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.stepCount}>{count}</Text><Pressable onPress={onIncrement} style={[styles.stepButton, { backgroundColor: habit.color, borderColor: habit.color }]}><Text style={styles.stepPlus}>+</Text></Pressable></View>}</View>;
}

function HabitDetail({ habit, logs, onClose, onEdit }: { habit: Habit | null; logs: Logs; onClose: () => void; onEdit: () => void }) {
  if (!habit) return null;
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d; });
  return <Modal animationType="slide" visible transparent onRequestClose={onClose}><View style={styles.modalShade}><View style={styles.sheet}><View style={styles.grabber}/><View style={styles.detailTop}><Pressable onPress={onClose}><Text style={styles.close}>‹</Text></Pressable><Text style={styles.detailTitle}>Habit progress</Text><Pressable onPress={onEdit}><Text style={styles.edit}>Edit</Text></Pressable></View><View style={styles.detailHero}><View style={[styles.bigIcon, { backgroundColor: habit.color }]}><Text style={{ fontSize: 35 }}>{habit.icon}</Text></View><Text style={styles.detailName}>{habit.name}</Text><Text style={styles.detailSub}>Last 30 days · goal: {habit.target} {displayUnit(habit)}</Text></View><View style={styles.legend}><Text style={styles.legendText}>Less</Text>{[0, .25, .5, .75, 1].map((p) => <View key={p} style={[styles.legendBox, { backgroundColor: habit.color, opacity: p === 0 ? .12 : .2 + p * .8 }]} />)}<Text style={styles.legendText}>Complete</Text></View><View style={styles.calendar}>{days.map((d) => { const count = logs[dateKey(d)]?.[habit.id] || 0; const ratio = count / habit.target; const clampedRatio = Math.min(1, ratio); const isToday = dateKey(d) === todayKey(); return <View key={dateKey(d)} style={styles.day}><Text style={styles.dayLabel}>{d.toLocaleDateString('en', { weekday: 'narrow' })}</Text><View style={[styles.dayBox, { backgroundColor: habit.color, opacity: clampedRatio ? .2 + clampedRatio * .8 : .1 }, isToday && styles.todayBox]}><Text style={[styles.dayNumber, ratio >= 0.7 && { color: '#fff' }]}>{d.getDate()}</Text></View>{habit.target > 1 && ratio > 0 && ratio < 1 && <Text style={styles.percent}>{Math.round(ratio * 100)}%</Text>}{ratio > 1 && <Text style={styles.percent}>{count} {displayUnit(habit)}</Text>}</View>; })}</View><View style={styles.tip}><Text style={styles.tipIcon}>✦</Text><Text style={styles.tipText}>Each square shows progress toward your daily {displayUnit(habit)} goal.</Text></View></View></View></Modal>;
}

function HabitEditor({ habit, onClose, onSave, onDelete }: { habit: Habit | null; onClose: () => void; onSave: (habit: Habit) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Habit | null>(habit);
  useEffect(() => setDraft(habit), [habit]);
  if (!draft) return null;
  return <Modal animationType="slide" visible transparent onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalShade}><View style={styles.sheet}><View style={styles.grabber}/><View style={styles.detailTop}><Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable><Text style={styles.detailTitle}>{draft.id ? 'Edit habit' : 'New habit'}</Text><Pressable onPress={() => { if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim(), unit: draft.unit.trim() || 'steps' }); }}><Text style={styles.edit}>Save</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}><Text style={styles.fieldLabel}>NAME YOUR HABIT</Text><TextInput autoFocus value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="e.g. Drink water" placeholderTextColor="#B4A79B" style={styles.input}/><Text style={styles.fieldLabel}>PICK AN ICON</Text><View style={styles.iconGrid}>{ICONS.map((icon) => <Pressable key={icon} onPress={() => setDraft({ ...draft, icon })} style={[styles.pickIcon, draft.icon === icon && { backgroundColor: draft.color }]}><Text style={{ fontSize: 22 }}>{icon}</Text></Pressable>)}</View><Text style={styles.fieldLabel}>DAILY GOAL</Text><View style={styles.targetRow}><Pressable onPress={() => setDraft({ ...draft, target: Math.max(1, draft.target - 1) })} style={styles.targetButton}><Text style={styles.stepText}>−</Text></Pressable><View><Text style={styles.targetNumber}>{draft.target}</Text><Text style={styles.targetCaption}>{draft.target === 1 ? 'one check-off' : 'check-offs per day'}</Text></View><Pressable onPress={() => setDraft({ ...draft, target: Math.min(20, draft.target + 1) })} style={[styles.targetButton, { backgroundColor: draft.color, borderColor: draft.color }]}><Text style={styles.stepPlus}>+</Text></Pressable></View><Text style={styles.fieldLabel}>WHAT ARE YOU COUNTING?</Text><TextInput value={draft.unit} onChangeText={(unit) => setDraft({ ...draft, unit })} placeholder="e.g. glasses, pages, liters" placeholderTextColor="#B4A79B" style={styles.input} maxLength={24}/><Text style={styles.unitHint}>Use a plural word for your count, like “glasses” or “pages”.</Text>{draft.id ? <Pressable onPress={() => Alert.alert('Delete habit?', `Remove ${draft.name}?`, [{ text: 'Keep it', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDelete(draft.id) }])}><Text style={styles.delete}>Delete habit</Text></Pressable> : null}</ScrollView></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FFF8ED'}, app:{flex:1,paddingHorizontal:20}, header:{paddingTop:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#B77955'}, title:{fontSize:30,fontWeight:'800',color:'#3D302B',marginTop:4}, date:{fontSize:14,color:'#8D7B70',marginTop:3}, sun:{width:50,height:50,borderRadius:25,backgroundColor:'#FFE0A1',alignItems:'center',justifyContent:'center'}, summary:{marginTop:24,backgroundColor:'#3F7068',borderRadius:22,padding:18},summaryCount:{fontSize:23,fontWeight:'800',color:'#FFF8ED'},summaryText:{fontSize:14,color:'#D9EEE7',marginTop:2},track:{height:8,backgroundColor:'#729A93',borderRadius:8,marginTop:16,overflow:'hidden'},fill:{height:'100%',backgroundColor:'#FFD78D',borderRadius:8},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:27,marginBottom:12},sectionTitle:{fontSize:19,fontWeight:'800',color:'#3D302B'},addText:{fontSize:14,fontWeight:'800',color:'#B65C40'},list:{paddingBottom:25,gap:11},card:{backgroundColor:'#FFFFFF',borderRadius:19,padding:13,flexDirection:'row',alignItems:'center',shadowColor:'#5B4234',shadowOpacity:.08,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:2},cardMain:{flex:1,flexDirection:'row',alignItems:'center'},icon:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},iconText:{fontSize:24},cardCopy:{marginLeft:13,flex:1},habitName:{fontSize:16,fontWeight:'800',color:'#453630'},doneText:{color:'#658B82'},habitSub:{fontSize:13,color:'#95867C',marginTop:2},miniTrack:{height:4,backgroundColor:'#F1ECE7',borderRadius:5,marginTop:8,overflow:'hidden'},miniFill:{height:'100%',borderRadius:5},check:{width:34,height:34,borderRadius:12,borderWidth:2,borderColor:'#D9D1C9',alignItems:'center',justifyContent:'center'},checkMark:{color:'#fff',fontSize:19,fontWeight:'800'},stepper:{flexDirection:'row',alignItems:'center',gap:7},stepButton:{width:31,height:31,borderWidth:1,borderColor:'#DFD6CF',borderRadius:11,alignItems:'center',justifyContent:'center'},stepText:{fontSize:21,color:'#6B5B52',lineHeight:24},stepPlus:{fontSize:21,color:'#fff',lineHeight:24},stepCount:{fontSize:15,fontWeight:'800',color:'#55453D',minWidth:14,textAlign:'center'},modalShade:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(53,39,33,.35)'},sheet:{backgroundColor:'#FFF8ED',borderTopLeftRadius:29,borderTopRightRadius:29,paddingHorizontal:20,paddingBottom:34,maxHeight:'92%'},grabber:{width:38,height:5,borderRadius:4,backgroundColor:'#D8CCC1',alignSelf:'center',marginTop:10},detailTop:{height:63,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},close:{fontSize:40,lineHeight:38,color:'#5C4A40'},cancel:{fontSize:15,color:'#76645A'},detailTitle:{fontSize:16,fontWeight:'800',color:'#443630'},edit:{fontSize:15,fontWeight:'800',color:'#B65C40'},detailHero:{alignItems:'center',marginTop:6},bigIcon:{width:76,height:76,borderRadius:25,alignItems:'center',justifyContent:'center'},detailName:{fontSize:25,fontWeight:'800',color:'#3D302B',marginTop:11},detailSub:{fontSize:14,color:'#938178',marginTop:3},legend:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,marginTop:23,marginBottom:15},legendText:{fontSize:11,color:'#8E7D73',marginHorizontal:3},legendBox:{height:13,width:13,borderRadius:4},calendar:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},day:{width:'13%',height:64,alignItems:'center',marginBottom:7},dayLabel:{fontSize:10,fontWeight:'700',color:'#9A887E',marginBottom:4},dayBox:{width:35,height:35,borderRadius:11,alignItems:'center',justifyContent:'center'},todayBox:{borderWidth:2,borderColor:'#3F7068'},dayNumber:{fontSize:12,fontWeight:'800',color:'#66554B'},percent:{fontSize:9,fontWeight:'800',color:'#806C60',marginTop:2},tip:{backgroundColor:'#F9E9D1',borderRadius:15,padding:13,flexDirection:'row',alignItems:'center',marginTop:8},tipIcon:{fontSize:18,color:'#B65C40',marginRight:8},tipText:{fontSize:12,color:'#79655A',flex:1,lineHeight:17},fieldLabel:{fontSize:11,fontWeight:'800',letterSpacing:1.1,color:'#9B7763',marginTop:17,marginBottom:8},input:{backgroundColor:'#fff',borderRadius:14,paddingHorizontal:15,height:52,fontSize:17,color:'#493A32'},unitHint:{fontSize:12,color:'#95867C',marginTop:7},iconGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},pickIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'#F4EDE5'},targetRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:26,backgroundColor:'#fff',borderRadius:17,paddingVertical:14},targetButton:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:'#E1D7CF',alignItems:'center',justifyContent:'center'},targetNumber:{fontSize:27,fontWeight:'800',color:'#463830',textAlign:'center'},targetCaption:{fontSize:11,color:'#9A887E'},delete:{color:'#C35945',fontWeight:'800',fontSize:15,textAlign:'center',marginTop:31,padding:14}
});
