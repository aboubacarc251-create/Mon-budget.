import React, {useEffect,useMemo,useState} from 'react';
import {Alert,SafeAreaView,ScrollView,Text,TextInput,TouchableOpacity,View,StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {initDb,getAccounts,createAccount,addMovement,transferMoney,getTransactions,getBudgets,saveBudget,createGoal,getGoals,Account} from './src/db';
import {checkCloudConfiguration} from './src/sync';

const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n)+' GNF';
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>today().slice(0,7);
const categories=['Alimentation','Transport','Logement','Santé','Loisirs','Famille','Éducation','Factures','Habillement','Autres'];

function Btn({title,onPress,secondary=false}:{title:string;onPress:()=>void;secondary?:boolean}) {
 return <TouchableOpacity onPress={onPress} style={[styles.btn,secondary&&styles.btnSecondary]}><Text style={[styles.btnText,secondary&&styles.btnSecondaryText]}>{title}</Text></TouchableOpacity>;
}
function Field({label,value,onChange,placeholder='',keyboardType='default'}:any) {
 return <View style={{marginBottom:12}}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType}/></View>;
}

export default function App() {
 const [ready,setReady]=useState(false),[tab,setTab]=useState('Accueil');
 const [accounts,setAccounts]=useState<Account[]>([]),[tx,setTx]=useState<any[]>([]),[budgets,setBudgets]=useState<any[]>([]),[goals,setGoals]=useState<any[]>([]);
 const [name,setName]=useState(''),[type,setType]=useState('Espèces'),[opening,setOpening]=useState('0');
 const [kind,setKind]=useState<'income'|'expense'>('expense'),[accountId,setAccountId]=useState('1'),[amount,setAmount]=useState(''),[desc,setDesc]=useState(''),[category,setCategory]=useState('Alimentation');
 const [from,setFrom]=useState('1'),[to,setTo]=useState('2'),[transfer,setTransfer]=useState('');
 const [budgetCat,setBudgetCat]=useState('Alimentation'),[budgetValue,setBudgetValue]=useState('');
 const [goalName,setGoalName]=useState(''),[goalTarget,setGoalTarget]=useState(''),[goalDate,setGoalDate]=useState('2027-12-31');
 const [cloud,setCloud]=useState('Vérification…');

 async function refresh(){
   const [a,t,b,g]=await Promise.all([getAccounts(),getTransactions(),getBudgets(month()),getGoals()]);
   setAccounts(a);setTx(t);setBudgets(b);setGoals(g);
   if(a.length){if(!a.some(x=>String(x.id)===accountId))setAccountId(String(a[0].id));if(!a.some(x=>String(x.id)===from))setFrom(String(a[0].id));if(!a.some(x=>String(x.id)===to))setTo(String(a[1]?.id??a[0].id));}
 }
 useEffect(()=>{(async()=>{try{await initDb();await refresh();const c=await checkCloudConfiguration();setCloud(c.message);}catch(e:any){Alert.alert('Erreur de démarrage',e.message);}finally{setReady(true);}})();},[]);
 const total=useMemo(()=>accounts.reduce((s,a)=>s+a.balance,0),[accounts]);
 const income=tx.filter(t=>t.kind==='income').reduce((s,t)=>s+t.amount,0);
 const expense=tx.filter(t=>t.kind==='expense').reduce((s,t)=>s+t.amount,0);
 async function run(fn:()=>Promise<any>){try{await fn();await refresh();}catch(e:any){Alert.alert('Opération impossible',e.message||'Une erreur est survenue.');}}
 if(!ready)return <SafeAreaView style={styles.center}><Text>Préparation de MON BUDGET…</Text></SafeAreaView>;

 return <SafeAreaView style={styles.safe}>
  <StatusBar style="light"/>
  <View style={styles.header}><Text style={styles.brand}>MON BUDGET</Text><Text style={styles.subtitle}>Maîtrisez votre argent</Text></View>
  <View style={styles.nav}>{['Accueil','Comptes','Opérations','Budgets','Épargne','Rapports'].map(x=><TouchableOpacity key={x} onPress={()=>setTab(x)} style={[styles.navItem,tab===x&&styles.navActive]}><Text style={[styles.navText,tab===x&&styles.navTextActive]}>{x}</Text></TouchableOpacity>)}</View>
  <ScrollView contentContainerStyle={styles.content}>
   {tab==='Accueil'&&<><View style={styles.hero}><Text style={styles.muted}>PATRIMOINE TOTAL</Text><Text style={styles.total}>{money(total)}</Text><View style={styles.row}><Text style={styles.green}>Revenus : {money(income)}</Text><Text style={styles.red}>Dépenses : {money(expense)}</Text></View></View><Text style={styles.heading}>Mes comptes</Text>{accounts.map(a=><View key={a.id} style={styles.card}><Text style={styles.cardTitle}>{a.name}</Text><Text style={styles.cardValue}>{money(a.balance)}</Text></View>)}<Text style={styles.heading}>Dernières opérations</Text>{tx.slice(0,8).map(t=><View key={t.id} style={styles.card}><Text style={styles.cardTitle}>{t.description}</Text><Text style={styles.muted}>{t.category} · {t.occurred_at}</Text><Text style={t.kind==='income'?styles.green:styles.red}>{t.kind==='income'?'+':'−'}{money(t.amount)}</Text></View>)}</>}
   {tab==='Comptes'&&<><Text style={styles.heading}>Créer un compte</Text><Field label="Nom du compte" value={name} onChange={setName} placeholder="Ex. Compte projet"/><Text style={styles.label}>Type : {type}</Text><View style={styles.rowWrap}>{['Espèces','Banque','Mobile Money','Épargne','Autre'].map(x=><Btn key={x} title={x} secondary={type!==x} onPress={()=>setType(x)}/>)}</View><Field label="Solde initial (GNF)" value={opening} onChange={setOpening} keyboardType="numeric"/><Btn title="Créer le compte" onPress={()=>run(async()=>{if(!name.trim()||!Number.isFinite(Number(opening))||Number(opening)<0)throw Error('Vérifie le nom et le solde initial.');await createAccount(name,type,Number(opening));setName('');setOpening('0');})}/><Text style={styles.heading}>Mes comptes</Text>{accounts.map(a=><View style={styles.card} key={a.id}><Text style={styles.cardTitle}>{a.name} · {a.type}</Text><Text style={styles.cardValue}>{money(a.balance)}</Text></View>)}</>}
   {tab==='Opérations'&&<><Text style={styles.heading}>Enregistrer une opération</Text><View style={styles.row}><Btn title="Dépense" secondary={kind!=='expense'} onPress={()=>setKind('expense')}/><Btn title="Revenu" secondary={kind!=='income'} onPress={()=>setKind('income')}/></View><Field label="Montant (GNF)" value={amount} onChange={setAmount} keyboardType="numeric"/><Field label="Description" value={desc} onChange={setDesc} placeholder="Ex. Courses"/><Text style={styles.label}>Catégorie : {category}</Text><View style={styles.rowWrap}>{(kind==='expense'?categories:['Salaire','Prime','Commerce','Activité secondaire','Remboursement','Autres']).map(x=><Btn key={x} title={x} secondary={category!==x} onPress={()=>setCategory(x)}/>)}</View><Text style={styles.label}>Compte</Text>{accounts.map(a=><TouchableOpacity key={a.id} onPress={()=>setAccountId(String(a.id))} style={[styles.card,accountId===String(a.id)&&styles.selected]}><Text>{a.name} · {money(a.balance)}</Text></TouchableOpacity>)}<Btn title="Enregistrer" onPress={()=>run(async()=>{const v=Number(amount);if(!desc.trim()||!Number.isFinite(v)||v<=0)throw Error('Saisis une description et un montant valide.');await addMovement(kind,Number(accountId),category,desc,v,today());setAmount('');setDesc('');})}/></>}
   {tab==='Budgets'&&<><Text style={styles.heading}>Budget mensuel · {month()}</Text><Text style={styles.label}>Catégorie : {budgetCat}</Text><View style={styles.rowWrap}>{categories.map(x=><Btn key={x} title={x} secondary={budgetCat!==x} onPress={()=>setBudgetCat(x)}/>)}</View><Field label="Plafond mensuel (GNF)" value={budgetValue} onChange={setBudgetValue} keyboardType="numeric"/><Btn title="Enregistrer le budget" onPress={()=>run(async()=>{const v=Number(budgetValue);if(!Number.isFinite(v)||v<0||budgetValue==='')throw Error('Montant invalide.');await saveBudget(month(),budgetCat,v);setBudgetValue('');})}/>{budgets.map(b=><View key={b.id} style={styles.card}><Text style={styles.cardTitle}>{b.category}</Text><Text>{money(b.spent)} dépensés / {money(b.limit_amount)}</Text><Text style={styles.muted}>Reste : {money(b.limit_amount-b.spent)}</Text></View>)}</>}
   {tab==='Épargne'&&<><Text style={styles.heading}>Objectifs d'épargne</Text><Field label="Nom du projet" value={goalName} onChange={setGoalName} placeholder="Ex. Achat voiture"/><Field label="Montant cible (GNF)" value={goalTarget} onChange={setGoalTarget} keyboardType="numeric"/><Field label="Échéance (AAAA-MM-JJ)" value={goalDate} onChange={setGoalDate}/><Btn title="Créer l'objectif" onPress={()=>run(async()=>{const v=Number(goalTarget);if(!goalName.trim()||!Number.isFinite(v)||v<=0)throw Error('Informations invalides.');await createGoal(goalName,v,goalDate);setGoalName('');setGoalTarget('');})}/>{goals.map(g=><View key={g.id} style={styles.card}><Text style={styles.cardTitle}>{g.name}</Text><Text>{money(g.saved_amount)} / {money(g.target_amount)}</Text><Text style={styles.muted}>Échéance : {g.deadline||'Non définie'}</Text></View>)}</>}
   {tab==='Rapports'&&<><Text style={styles.heading}>Rapport global</Text><View style={styles.card}><Text>Revenus enregistrés</Text><Text style={styles.green}>{money(income)}</Text></View><View style={styles.card}><Text>Dépenses enregistrées</Text><Text style={styles.red}>{money(expense)}</Text></View><View style={styles.card}><Text>Solde net des opérations</Text><Text style={styles.cardValue}>{money(income-expense)}</Text></View><Text style={styles.muted}>Les transferts internes sont exclus des revenus et dépenses. Le bilan annuel et l'export PDF/Excel seront ajoutés dans une prochaine itération.</Text></>}
   <View style={styles.footer}><Text style={styles.muted}>Sauvegarde locale SQLite · {cloud}</Text></View>
  </ScrollView>
 </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#F4F6FA'},center:{flex:1,alignItems:'center',justifyContent:'center'},
 header:{backgroundColor:'#14243B',padding:20,paddingTop:30},brand:{color:'#FFF',fontSize:25,fontWeight:'800',letterSpacing:1},subtitle:{color:'#B8C9DC',marginTop:3},
 nav:{flexDirection:'row',flexWrap:'wrap',backgroundColor:'#203650',paddingHorizontal:8,paddingVertical:8},navItem:{paddingVertical:8,paddingHorizontal:10,borderRadius:9,margin:2},navActive:{backgroundColor:'#FFF'},navText:{color:'#D5DFEA',fontSize:12},navTextActive:{color:'#14243B',fontWeight:'700'},
 content:{padding:16,paddingBottom:40},hero:{backgroundColor:'#14243B',padding:20,borderRadius:18,marginBottom:20},muted:{color:'#7A8797',fontSize:12,marginTop:4},total:{color:'#FFF',fontSize:27,fontWeight:'800',marginVertical:8},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},rowWrap:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12},green:{color:'#168653',fontWeight:'700'},red:{color:'#C34444',fontWeight:'700'},
 heading:{fontSize:19,fontWeight:'800',color:'#17283D',marginTop:16,marginBottom:12},card:{backgroundColor:'#FFF',padding:14,borderRadius:13,marginBottom:9,borderWidth:1,borderColor:'#E8ECF2'},cardTitle:{fontWeight:'700',color:'#17283D',fontSize:15},cardValue:{fontWeight:'800',fontSize:18,color:'#17283D',marginTop:5},selected:{borderColor:'#2C78B8',borderWidth:2},
 label:{fontWeight:'700',color:'#34445A',marginBottom:6},input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE2EA',borderRadius:10,padding:12,color:'#17283D'},
 btn:{backgroundColor:'#176B9B',paddingVertical:11,paddingHorizontal:13,borderRadius:10,marginVertical:3},btnText:{color:'#FFF',fontWeight:'700',fontSize:12},btnSecondary:{backgroundColor:'#E5EBF2'},btnSecondaryText:{color:'#34445A'},footer:{paddingVertical:20,alignItems:'center'}
});
